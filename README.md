# PMX模型展示系统

这是一个使用Python Flask后端和Three.js前端构建的PMX模型展示系统，可以动态加载和显示MMD模型文件。

## 功能特性

- ✅ 动态扫描MMD目录中的模型文件（ZIP和PMX格式）
- ✅ 通过后端API提供模型文件列表
- ✅ 3D模型实时预览和交互
- ✅ 支持从ZIP压缩包中提取和加载PMX模型
- ✅ 响应式设计，适配不同屏幕尺寸
- ✅ 自动调整相机以完整显示模型

## 系统要求

- Python 3.6+
- Node.js 14+
- 现代Web浏览器（支持WebGL）

## 安装步骤

### 1. 安装Python依赖

```bash
pip install flask flask-cors
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 准备模型文件

将您的PMX和ZIP模型文件放入以下目录：

```
e:\ThreeWeb\MMD\
```

系统会自动扫描该目录中的所有模型文件。

## 运行系统

### 1. 启动后端服务器

```bash
python backend.py
```

后端服务将在 http://localhost:5000 上运行。

### 2. 启动前端开发服务器

```bash
npm start
```

前端服务将在 http://localhost:3000 上运行。

## 使用方法

1. 打开浏览器，访问 http://localhost:3000
2. 在模型列表中选择一个模型，点击「加载模型」按钮
3. 使用鼠标交互：
   - 拖拽：旋转模型
   - 滚轮：缩放
   - 右键拖拽：平移

## 项目结构

```
ThreeWeb/
├── main.js         # Three.js渲染和模型加载核心逻辑
├── index.html      # 主页面，包含模型列表
├── view.html       # 模型查看页面
├── backend.py      # Python Flask后端API
├── MMD/            # 存放模型文件的目录
└── README.md       # 项目说明文档
```

## API接口说明

### GET /api/models

获取所有可用的模型文件列表。

**返回格式：**
```json
{
  "models": [
    {
      "name": "模型名称",
      "path": "模型路径",
      "type": "zip或pmx"
    }
  ]
}
```

## 注意事项

1. 确保MMD目录有正确的读写权限
2. 大型模型文件可能需要更长的加载时间
3. 某些复杂的MMD模型可能需要额外的纹理和资源文件

## 故障排除

- **模型加载失败**：检查模型文件是否完整，路径是否正确
- **后端服务启动失败**：确保Python和依赖包已正确安装
- **前端访问后端出错**：检查CORS设置，确保端口号正确

## 许可证

MIT License

## 更新日志

### 1.0.0
- 初始版本发布
- 支持PMX和ZIP格式模型
- 实现动态模型列表加载
- 优化模型显示和交互体验