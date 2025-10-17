from flask import Flask, jsonify, send_from_directory, render_template, request, abort
import os
import re
import zipfile
import shutil

# 创建Flask应用实例
app = Flask(__name__, 
            template_folder='templates',  # 设置模板目录
            static_folder='static')       # 设置静态文件目录

# 解压目录配置
UNZIP_DIR = 'MMD/unzipped'  # 用于存放解压后的文件的目录

# 配置CORS
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

# 从文件名提取模型名称
def extract_model_name(file_name):
    if file_name.endswith('.zip'):
        # 处理格式：【模之屋】XXX_by_XXX_XXX.zip
        match1 = re.search(r'【[^】]+】([^_]+)_by', file_name)
        # 处理格式：XXX_by_XXX_XXX.zip
        match2 = re.search(r'^([^_]+)_by', file_name)
        if match1:
            return match1.group(1)
        elif match2:
            return match2.group(1)
        else:
            # 默认返回去掉扩展名的文件名
            return os.path.splitext(file_name)[0]
    elif file_name.endswith('.pmx'):
        # 处理PMX文件
        return os.path.splitext(file_name)[0]
    return file_name

# API路由：获取模型文件列表
@app.route('/api/models')
def get_models():
    try:
        # 定义目录路径（保持原有目录结构）
        mmd_dir = 'MMD'
        pmx_dir = os.path.join(mmd_dir, 'model')
        
        # 初始化结果
        models = {
            'zip': [],
            'pmx': []
        }
        
        # 扫描ZIP文件
        if os.path.exists(mmd_dir):
            for file_name in os.listdir(mmd_dir):
                if file_name.endswith('.zip'):
                    file_path = os.path.join(mmd_dir, file_name)
                    if os.path.isfile(file_path):
                        models['zip'].append({
                            'name': extract_model_name(file_name),
                            'fileName': file_name,
                            'path': mmd_dir + '/',
                            'fullPath': file_path.replace('\\', '/')  # 确保路径使用正斜杠
                        })
        
        # 扫描PMX文件
        if os.path.exists(pmx_dir):
            for file_name in os.listdir(pmx_dir):
                if file_name.endswith('.pmx'):
                    file_path = os.path.join(pmx_dir, file_name)
                    if os.path.isfile(file_path):
                        models['pmx'].append({
                            'name': extract_model_name(file_name),
                            'fileName': file_name,
                            'path': pmx_dir + '/',
                            'fullPath': file_path.replace('\\', '/')  # 确保路径使用正斜杠
                        })
        
        return jsonify(models)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 主页面路由 - 使用render_template渲染模板
@app.route('/')
def index():
    return render_template('index.html')

# 提供MMD目录下的文件访问
@app.route('/MMD/<path:path>')
def serve_mmd_files(path):
    return send_from_directory('MMD', path)

# API路由：检查ZIP文件是否已解压
@app.route('/api/check-unzip', methods=['POST'])
def check_unzip():
    try:
        # 获取请求数据
        data = request.get_json()
        zip_name = data.get('zipPath')
        
        if not zip_name:
            return jsonify({'error': '未提供ZIP文件名'}), 400
        
        # 确保UNZIP_DIR存在
        if not os.path.exists(UNZIP_DIR):
            os.makedirs(UNZIP_DIR)
            print(f'创建解压目录: {UNZIP_DIR}')
        
        # 确保文件名包含.zip扩展名
        if not zip_name.endswith('.zip'):
            zip_name += '.zip'
        
        # 使用文件名作为解压目录名
        zip_name_without_ext = os.path.splitext(zip_name)[0]
        extract_dir = os.path.join(UNZIP_DIR, zip_name_without_ext)
        
        # 检查解压目录是否存在
        if os.path.exists(extract_dir):
            # 查找PMX文件
            pmx_files = []
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    if file.lower().endswith('.pmx'):
                        pmx_files.append(os.path.join(root, file))
            
            if pmx_files:
                # 对PMX文件进行排序，优先选择角色模型而不是武器文件
                def prioritize_character_model(file_path):
                    file_name = os.path.basename(file_path).lower()
                    # 武器相关关键词，这类文件优先级较低
                    weapon_keywords = ['武器', '刀', '剑', 'katana', 'sword', 'weapon']
                    # 检查是否包含武器关键词
                    for keyword in weapon_keywords:
                        if keyword in file_name:
                            return 1  # 武器文件优先级低
                    # 角色相关关键词，这类文件优先级较高
                    character_keywords = ['模型', 'character', 'body', '全身']
                    for keyword in character_keywords:
                        if keyword in file_name:
                            return -1  # 角色文件优先级高
                    # 其他文件保持默认优先级
                    return 0
                
                # 按优先级排序
                pmx_files.sort(key=prioritize_character_model)
                
                # 返回优先级最高的PMX文件（应该是角色模型）
                pmx_relative_path = os.path.relpath(pmx_files[0], os.getcwd())
                print(f'选择默认PMX文件: {pmx_relative_path}')
                return jsonify({
                    'status': 'unzipped',
                    'pmxPath': pmx_relative_path
                })
        
        # 如果解压目录不存在或没有PMX文件
        return jsonify({'status': 'not_unzipped'})
        
    except Exception as e:
        print(f'检查解压状态时出错: {str(e)}')
        return jsonify({'error': str(e)}), 500

# API路由：解压ZIP文件
@app.route('/api/unzip-model', methods=['POST'])
def unzip_model():
    try:
        # 获取请求数据
        data = request.get_json()
        zip_name = data.get('zipPath')
        
        if not zip_name:
            return jsonify({'error': '未提供ZIP文件名'}), 400
        
        # 确保文件名包含.zip扩展名
        if not zip_name.endswith('.zip'):
            zip_name += '.zip'
        
        # 构建完整的ZIP文件路径
        zip_path = os.path.join('MMD', zip_name)
        
        # 确保ZIP文件存在
        if not os.path.exists(zip_path):
            return jsonify({'error': f'ZIP文件不存在: {zip_path}'}), 404
        
        # 确保UNZIP_DIR存在
        if not os.path.exists(UNZIP_DIR):
            os.makedirs(UNZIP_DIR)
            print(f'创建解压目录: {UNZIP_DIR}')
        
        # 使用文件名作为解压目录名
        zip_name_without_ext = os.path.splitext(zip_name)[0]
        extract_dir = os.path.join(UNZIP_DIR, zip_name_without_ext)
        
        # 如果解压目录已存在，先删除
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
            print(f'删除已存在的解压目录: {extract_dir}')
        
        # 创建解压目录
        os.makedirs(extract_dir)
        print(f'创建解压目标目录: {extract_dir}')
        
        # 解压ZIP文件
        print(f'开始解压: {zip_path} -> {extract_dir}')
        try:
            with zipfile.ZipFile(zip_path, 'r', allowZip64=True) as zip_ref:
                zip_ref.extractall(extract_dir)
            print('解压完成')
        except Exception as zip_error:
            print(f'解压过程出错: {str(zip_error)}')
            # 清理失败的解压目录
            if os.path.exists(extract_dir):
                shutil.rmtree(extract_dir)
            return jsonify({'error': f'解压失败: {str(zip_error)}'}), 500
        
        # 查找PMX文件
        pmx_files = []
        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                if file.lower().endswith('.pmx'):
                    pmx_files.append(os.path.join(root, file))
        
        if not pmx_files:
            # 清理空目录
            shutil.rmtree(extract_dir)
            return jsonify({'error': 'ZIP文件中未找到PMX模型文件'}), 400
        
        # 对PMX文件进行排序，优先选择角色模型而不是武器文件
        def prioritize_character_model(file_path):
            file_name = os.path.basename(file_path).lower()
            # 武器相关关键词，这类文件优先级较低
            weapon_keywords = ['武器', '刀', '剑', 'katana', 'sword', 'weapon']
            # 检查是否包含武器关键词
            for keyword in weapon_keywords:
                if keyword in file_name:
                    return 1  # 武器文件优先级低
            # 角色相关关键词，这类文件优先级较高
            character_keywords = ['模型', 'character', 'body', '全身']
            for keyword in character_keywords:
                if keyword in file_name:
                    return -1  # 角色文件优先级高
            # 其他文件保持默认优先级
            return 0
        
        # 按优先级排序
        pmx_files.sort(key=prioritize_character_model)
        
        # 返回优先级最高的PMX文件（应该是角色模型）
        pmx_relative_path = os.path.relpath(pmx_files[0], os.getcwd())
        print(f'选择默认PMX文件: {pmx_relative_path}')
        return jsonify({
            'success': True,
            'pmxPath': pmx_relative_path
        })
        
    except zipfile.BadZipFile:
        return jsonify({'error': '无效的ZIP文件'}), 400
    except Exception as e:
        print(f'解压ZIP文件时出错: {str(e)}')
        return jsonify({'error': str(e)}), 500

# 获取指定ZIP模型中的所有PMX文件列表
@app.route('/api/get-pmx-files', methods=['POST'])
def get_pmx_files():
    try:
        # 获取请求数据
        data = request.get_json()
        zip_name = data.get('zipPath')
        
        if not zip_name:
            return jsonify({'error': '未提供ZIP文件名'}), 400
        
        # 确保文件名包含.zip扩展名
        if not zip_name.endswith('.zip'):
            zip_name += '.zip'
        
        # 使用文件名作为解压目录名
        zip_name_without_ext = os.path.splitext(zip_name)[0]
        extract_dir = os.path.join(UNZIP_DIR, zip_name_without_ext)
        
        # 检查解压目录是否存在
        if not os.path.exists(extract_dir):
            return jsonify({'error': '模型未解压'}), 404
        
        # 查找所有PMX文件
        pmx_files = []
        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                if file.lower().endswith('.pmx'):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, os.getcwd())
                    # 计算相对于解压目录的路径，用于显示
                    display_path = os.path.relpath(file_path, extract_dir)
                    pmx_files.append({
                        'fileName': file,
                        'path': relative_path,
                        'displayPath': display_path
                    })
        
        if not pmx_files:
            return jsonify({'error': '未找到PMX文件'}), 404
        
        return jsonify({
            'pmxFiles': pmx_files
        })
        
    except Exception as e:
        print(f'获取PMX文件列表时出错: {str(e)}')
        return jsonify({'error': str(e)}), 500

# 提供UNZIP_DIR目录下的文件访问
@app.route('/MMD/unzipped/<path:path>')
def serve_unzipped_files(path):
    return send_from_directory('MMD/unzipped', path)

# 主页面路由 - 使用render_template渲染模板
@app.route('/view')
def view_page():
    return render_template('view.html')

# 其他路由保持不变，但建议将静态资源移至static目录

if __name__ == '__main__':
    # 确保必要的目录存在
    required_dirs = ['templates', 'static', 'MMD', 'MMD/model', UNZIP_DIR]
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f'创建目录: {dir_path}')
    
    app.run(host='0.0.0.0', port=5000, debug=True)