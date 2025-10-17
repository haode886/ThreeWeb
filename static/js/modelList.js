// 动态获取模型数据
let zipModels = [];

// 从文件名提取模型名称
function extractModelName(fileName) {
    // 处理ZIP文件命名格式
    if (fileName.endsWith('.zip')) {
        // 处理格式：【模之屋】XXX_by_XXX_XXX.zip
        const match1 = fileName.match(/【[^】]+】([^_]+)_by/);
        // 处理格式：XXX_by_XXX_XXX.zip
        const match2 = fileName.match(/^([^_]+)_by/);
        if (match1) return match1[1];
        if (match2) return match2[1];
        // 默认返回去掉扩展名的文件名
        return fileName.replace('.zip', '');
    }
    return fileName;
}

// 动态加载模型文件
async function loadModelFiles() {
    const loadingElement = document.querySelector('.loading');
    
    try {
        // 从后端API获取模型文件列表
        const response = await fetch('/api/models');
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }
        
        // 解析JSON响应
        const data = await response.json();
        
        // 如果API返回错误
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 更新ZIP模型数据
        zipModels = data.zip || [];
        
        console.log('从后端API获取的ZIP模型文件数量:', zipModels.length);
        console.log('API返回的完整数据:', data);
        
    } catch (error) {
        console.error('加载模型文件失败:', error);
    } finally {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        generateModelList();
    }
}

// 动态生成模型列表
function generateModelList() {
    const modelList = document.querySelector('.model-list');
    const noModels = document.querySelector('.no-models');
    
    if (!modelList || !noModels) return;
    
    // 清空列表
    modelList.innerHTML = '';
    
    // 检查是否有ZIP模型
    if (zipModels && zipModels.length > 0) {
        // 遍历ZIP模型数据
        zipModels.forEach(model => {
            // 创建列表项
            const listItem = document.createElement('li');
            
            // 设置列表项内容
                listItem.innerHTML = `
                    <div class="model-info-wrapper">
                        <div class="model-title">${model.name || extractModelName(model.fileName)}</div>
                        <div class="model-info">文件名: ${model.fileName}</div>
                    </div>
                    <button class="view-model-btn" data-model="${model.fullPath || model.fileName}" data-type="zip" data-name="${model.name || extractModelName(model.fileName)}">
                        查看模型
                    </button>
                `;
            
            // 添加到列表
            modelList.appendChild(listItem);
        });
        
        // 显示模型列表，隐藏无模型提示
        modelList.style.display = 'block';
        noModels.style.display = 'none';
    } else {
        // 显示无模型提示
        modelList.style.display = 'none';
        noModels.style.display = 'block';
    }
    
    // 添加模型查看按钮的点击事件
    document.querySelectorAll('.view-model-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 立即获取参数并跳转，不进行任何预加载或检查
            const modelPath = this.getAttribute('data-model');
            const modelName = this.getAttribute('data-name');
            
            // 构建URL参数
            const params = new URLSearchParams();
            // 简化路径处理，只需要文件名
            const fileName = modelPath.split('/').pop();
            params.set('zip', fileName);
            params.set('name', modelName);
            
            // 立即跳转到模型查看页面
            window.location.href = `/view?${params.toString()}`;
        });
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 调用loadModelFiles函数来实现动态加载模型数据
    loadModelFiles();
});