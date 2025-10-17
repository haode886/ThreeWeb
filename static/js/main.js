// 使用全局变量而非import语句，这些库已通过CDN在HTML中引入
// 检查Three.js版本
console.log('Three.js版本:', THREE.REVISION);

console.log('OrbitControls可用:', typeof THREE.OrbitControls !== 'undefined');
console.log('MMDLoader可用:', typeof THREE.MMDLoader !== 'undefined');
console.log('MMDAnimationHelper可用:', typeof THREE.MMDAnimationHelper !== 'undefined');
console.log('JSZip可用:', typeof JSZip !== 'undefined');

// 初始化场景
let scene, camera, renderer, controls;
let currentModel = null;
let helper = null;
let isRotating = false;
let rotationSpeed = 0.01;

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
    // 处理PMX文件
    return fileName.replace('.pmx', '');
}

// 初始化标志
window.isInitialized = false;

// 初始化函数
window.init = function() {
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('canvas'),
    antialias: true 
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  // 添加方向光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // 移除了辅助网格，简化显示效果
  
  // 添加控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 初始化动画助手
    helper = new THREE.MMDAnimationHelper();
  
  // 添加窗口大小调整监听
  window.addEventListener('resize', onWindowResize);
  
  // 绑定模型选择事件
    document.getElementById('load-model').addEventListener('click', loadSelectedModel);
    
    // 绑定重置视角按钮事件
    if (document.getElementById('reset-view')) {
        document.getElementById('reset-view').addEventListener('click', function() {
            if (window.resetView) {
                window.resetView();
            } else {
                console.warn('重置视角功能尚未初始化');
            }
        });
    }
    
    // 绑定旋转开关按钮事件
    if (document.getElementById('toggle-rotation')) {
        document.getElementById('toggle-rotation').addEventListener('click', function() {
            isRotating = !isRotating;
            this.textContent = isRotating ? '停止旋转' : '开启旋转';
            console.log('模型旋转状态:', isRotating ? '开启' : '关闭');
        });
    }
    
    // 设置初始化完成标志
    window.isInitialized = true;
  
  // 解析URL参数
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    // 处理模型路径，确保与后端API兼容
    function processModelPath(path) {
        if (!path) return path;
        
        // 如果已经是完整URL，直接返回
        if (path.startsWith('http')) {
            return path;
        }
        
        // 如果是相对路径，转换为绝对路径
        if (!path.startsWith('/')) {
            return `/${path}`;
        }
        
        return path;
    }
    
    // 解压ZIP文件并加载其中的PMX模型
window.extractAndLoadModelFromZip = async function(zipPath) {
        // 添加立即执行的日志，确保函数被调用
        console.log('**** extractAndLoadModelFromZip函数被调用 ****');
        console.log('原始ZIP路径:', zipPath);
        
        // 直接构建绝对URL，避免路径处理问题
        let finalPath = zipPath;
        
        // 确保使用绝对URL访问后端资源
        if (!finalPath.startsWith('http')) {
            // 如果路径以/开头，直接添加前缀，否则添加前缀和/符号
            if (finalPath.startsWith('/')) {
                // 使用相对路径，避免硬编码localhost
    finalPath = finalPath;
            } else {
                // 使用相对路径，避免硬编码localhost
    finalPath = `/${finalPath}`;
            }
        }
        
        console.log('最终ZIP文件URL:', finalPath);
        console.log('准备发送ZIP文件请求...');
        
        // 立即发送一个简单的fetch请求来测试ZIP文件是否可以被访问
        try {
            console.log('发送测试请求到:', finalPath);
            const response = await fetch(finalPath, { method: 'GET' });
            console.log('测试请求状态:', response.status);
            console.log('测试请求状态文本:', response.statusText);
        } catch (error) {
            console.error('测试请求失败:', error);
        }
        
        // 显示加载指示器
        showLoadingIndicator();
        
        // 从URL中提取模型名称
        const zipFileName = zipPath.split('/').pop().split('\\').pop().replace('.zip', '');
        console.log('提取的ZIP文件名:', zipFileName);
        updateModelInfo(`解压中: ${zipFileName}`);
        
        try {
            console.log(`正在加载并解压ZIP文件: ${zipPath}`);
            
            // 获取ZIP文件数据
            console.log('开始请求ZIP文件...');
            const response = await fetch(finalPath);
            console.log('ZIP文件请求完成，状态:', response.status);
            
            if (!response.ok) {
                throw new Error(`无法加载ZIP文件: ${response.statusText}`);
            }
            
            console.log('开始获取ZIP文件数据...');
            const arrayBuffer = await response.arrayBuffer();
            console.log('获取到ZIP文件数据，大小:', arrayBuffer.byteLength, '字节');
            
            // 解压ZIP文件
            console.log('开始解压ZIP文件...');
            const zip = await JSZip.loadAsync(arrayBuffer);
            console.log('ZIP文件解压完成');
            
            // 输出ZIP中的所有文件列表
            console.log('ZIP中的文件列表:', Object.keys(zip.files));
            
            // 查找ZIP中的PMX文件
            console.log('开始查找ZIP中的PMX文件...');
            let pmxFile = null;
            let pmxFileName = '';
            
            for (const file in zip.files) {
                if (file.toLowerCase().endsWith('.pmx')) {
                    pmxFile = zip.files[file];
                    pmxFileName = file;
                    console.log(`找到PMX文件: ${pmxFileName}`);
                    break;
                }
            }
            
            if (!pmxFile) {
                console.error('ZIP文件中未找到PMX模型文件');
                throw new Error('ZIP文件中未找到PMX模型文件');
            }
            
            updateModelInfo(`加载中: ${pmxFileName.replace('.pmx', '')}`);
            console.log('准备加载模型:', pmxFileName.replace('.pmx', ''));
            
            // 提取PMX文件内容
            console.log('开始提取PMX文件内容...');
            const pmxContent = await pmxFile.async('arraybuffer');
            console.log('PMX文件内容提取完成，大小:', pmxContent.byteLength, '字节');
            
            // 准备材质文件映射（用于处理纹理）
            console.log('开始提取ZIP中的纹理文件...');
            const textureMap = new Map();
            let textureCount = 0;
            
            // 提取ZIP中的所有纹理文件
            for (const file in zip.files) {
                if (file.toLowerCase().match(/\.(bmp|jpg|jpeg|png|gif|tga)$/)) {
                    console.log(`正在提取纹理: ${file}`);
                    const textureContent = await zip.files[file].async('arraybuffer');
                    const textureBlob = new Blob([textureContent], { type: 'image/' + file.split('.').pop() });
                    const textureUrl = URL.createObjectURL(textureBlob);
                    textureMap.set(file.split('/').pop(), textureUrl);
                    console.log(`提取纹理文件成功: ${file}`);
                    textureCount++;
                }
            }
            
            console.log(`成功提取${textureCount}个纹理文件`);
            
            // 重写MMDLoader的loadTexture方法以使用解压的纹理
            console.log('开始重写MMDLoader的loadTexture方法...');
            const originalLoadTexture = MMDLoader.prototype.loadTexture;
            MMDLoader.prototype.loadTexture = function(url, mapping, onLoad, onProgress, onError) {
                // 获取文件名部分
                const fileName = url.split('/').pop();
                // 如果找到对应的解压纹理，使用它
                if (textureMap.has(fileName)) {
                    console.log(`使用解压的纹理: ${fileName}`);
                    return originalLoadTexture.call(this, textureMap.get(fileName), mapping, onLoad, onProgress, onError);
                }
                // 否则使用原始URL
                console.log(`使用原始URL纹理: ${url}`);
                return originalLoadTexture.call(this, url, mapping, onLoad, onProgress, onError);
            };
            
            // 清除当前模型
            if (currentModel) {
                console.log('清除当前模型');
                scene.remove(currentModel);
                helper.reset();
                currentModel = null;
            }
            
            // 使用修改后的加载器加载PMX模型
            console.log('开始使用MMDLoader解析模型...');
            const loader = new THREE.MMDLoader();
            
            try {
                // 从ArrayBuffer加载模型
                const object = loader.parse(pmxContent, '');
                console.log('模型解析成功，对象类型:', object.type);
                
                // 缩放模型大小
                const scale = 1.0;
                object.scale.set(scale, scale, scale);
                console.log('模型缩放完成，比例:', scale);
                
                // 计算模型中心点
                const box = new THREE.Box3().setFromObject(object);
                const center = new THREE.Vector3();
                box.getCenter(center);
                console.log('计算模型中心点:', center);
                
                // 模型居中
                object.position.sub(center);
                console.log('模型居中完成，新位置:', object.position);
                
                // 添加到场景
                scene.add(object);
                currentModel = object;
                console.log('模型已添加到场景');
                
                // 关键修复：将模型添加到MMDAnimationHelper中进行正确的材质和光照处理
                // 这是解决模型泛白问题的核心
                try {
                    helper.add(object, {
                        animation: {},  // 使用空对象而不是false，避免初始化动画
                        physics: false  // 禁用物理模拟
                    });
                    console.log('模型已添加到MMDAnimationHelper中');
                } catch (error) {
                    console.warn('添加模型到MMDAnimationHelper时出错:', error);
                    // 即使出错也继续执行，确保场景能正常显示
                }
                
                // 设置相机位置以完整显示模型
                const size = new THREE.Vector3();
                box.getSize(size);
                console.log('模型尺寸:', size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                cameraZ *= 1.5; // 稍微拉远一点
                camera.position.z = cameraZ;
                console.log('相机Z位置设置为:', cameraZ);
                
                const minZ = box.min.z;
                const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
                camera.far = cameraToFarEdge * 3;
                camera.updateProjectionMatrix();
                console.log('相机投影矩阵已更新，far值:', camera.far);
                
                // 更新控制器目标
                controls.target.set(0, 0, 0);
                controls.update();
                console.log('控制器目标已更新');
                
                // 更新模型信息
                updateModelInfo(pmxFileName.replace('.pmx', ''));
                console.log('模型从ZIP加载成功:', pmxFileName);
                console.log('===== ZIP模型加载完成 =====');
                
            } catch (parseError) {
                console.error('解析PMX模型失败:', parseError);
                throw new Error(`解析PMX模型失败: ${parseError.message}`);
            } finally {
                // 恢复原始的loadTexture方法
                console.log('恢复原始的loadTexture方法');
                MMDLoader.prototype.loadTexture = originalLoadTexture;
                hideLoadingIndicator();
            }
            
        } catch (error) {
            console.error('ZIP解压和模型加载失败:', error);
            handleError(`ZIP解压和模型加载失败: ${error.message}`);
            updateModelInfo(`加载失败: ${zipFileName}`);
            hideLoadingIndicator();
        }
    }
    
    // 修改加载模型按钮的点击事件处理函数
    document.getElementById('load-model').addEventListener('click', function() {
        console.log('加载模型按钮被点击');
        // 首先尝试获取pmx-file-selector（view.html中的选择器）
        const pmxSelector = document.getElementById('pmx-file-selector');
        // 然后尝试获取models选择器（可能在其他页面使用）
        const modelsSelector = document.getElementById('models');
        
        if (pmxSelector && !pmxSelector.disabled) {
            const selectedModel = pmxSelector.value;
            if (selectedModel) {
                console.log('选择的PMX文件:', selectedModel);
                loadMMDModel(selectedModel);
            }
        } else if (modelsSelector) {
            const selectedModel = modelsSelector.value;
            console.log('选择的模型:', selectedModel);
            if (selectedModel) {
                loadMMDModel(selectedModel);
            }
        } else {
            console.log('未找到有效的模型选择器');
            // 如果没有选择器，可以尝试重新加载当前模型
            if (window.location.search.includes('zip=')) {
                window.location.reload();
            }
        }
    });
    
    // 检查URL参数
    const zipParam = getUrlParameter('zip');
    const modelParam = getUrlParameter('model');
    
    // 确保页面完全加载后执行
    window.addEventListener('DOMContentLoaded', function() {
        // 重新获取最新的URL参数
        const currentZipParam = getUrlParameter('zip');
        const currentModelParam = getUrlParameter('model');
        
        if (currentZipParam) {
            // 如果有ZIP参数，解压并加载其中的PMX模型
            const processedZipPath = processModelPath(currentZipParam);
            console.log('加载ZIP模型:', processedZipPath);
            extractAndLoadModelFromZip(processedZipPath);
        } else if (currentModelParam) {
            // 如果有模型参数，直接加载模型
            const processedModelPath = processModelPath(currentModelParam);
            console.log('加载PMX模型:', processedModelPath);
            loadMMDModel(processedModelPath);
        } else if (document.getElementById('pmx-file-selector')) {
            // 检查是否有pmx-file-selector（view.html页面）
            console.log('在view.html页面，等待用户选择模型或模型自动加载');
        } else if (document.getElementById('models')) {
            // 如果没有URL参数且有models选择器，加载默认模型
            const modelValue = document.getElementById('models').value;
            if (modelValue) {
                const processedModelPath = processModelPath(modelValue);
                loadMMDModel(processedModelPath);
            }
        } else {
            // 如果没有URL参数且没有模型选择器，显示提示信息
            updateModelInfo('请从模型列表页面选择模型');
        }
    });
  
  // 开始渲染循环
  animate();
  }
  
  // 重置视角函数
  window.resetView = function() {
  if (camera && controls && currentModel) {
    // 与模型加载完成后相同的相机位置计算逻辑
    // 计算模型包围盒
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // 计算合适的相机Z位置
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // 稍微拉远一点
    
    // 设置相机位置和目标
    camera.position.set(0, 1.5, cameraZ);
    camera.lookAt(0, 1, 0);
    
    // 更新相机远平面
    const minZ = box.min.z;
    const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
    camera.far = cameraToFarEdge * 3;
    camera.updateProjectionMatrix();
    
    // 重置控制器
    controls.target.set(0, 0, 0);
    controls.reset();
    
    console.log('视角已重置为模型加载时的初始视角，相机Z位置:', cameraZ);
  } else {
    console.warn('相机、控制器或模型未初始化');
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadSelectedModel() {
  console.log('模型选择按钮被点击');
  // 首先检查是否存在pmx-file-selector（view.html中使用）
  const pmxSelector = document.getElementById('pmx-file-selector');
  if (pmxSelector && !pmxSelector.disabled && pmxSelector.value) {
    const selectedModel = pmxSelector.value;
    console.log('选择的PMX文件:', selectedModel);
    loadMMDModel(selectedModel);
    return;
  }
  
  // 然后检查是否存在models选择器（其他页面可能使用）
  const modelSelect = document.getElementById('models');
  if (modelSelect && modelSelect.value) {
    const modelName = modelSelect.value;
    console.log('选择的模型名称:', modelName);
    const modelPath = `MMD/model/${modelName}`;
    console.log('将加载模型路径:', modelPath);
    loadMMDModel(modelPath);
  } else {
    console.warn('未找到有效的模型选择器或没有选择模型');
  }
}

// 更新状态信息的函数
// 简化错误处理，只在控制台输出
function handleError(err, modelPath = '') {
  console.error('MMD模型加载错误:', {
    message: err.message || '未知错误',
    modelPath: modelPath,
    timestamp: new Date().toLocaleString()
  });
}

// 显示加载指示器
function showLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
}

// 隐藏加载指示器
function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// 更新模型信息显示
function updateModelInfo(modelName) {
  const modelInfoElement = document.getElementById('current-model-name');
  if (modelInfoElement) {
    modelInfoElement.textContent = `当前模型: ${modelName}`;
  }
}

window.loadMMDModel = async function(modelPath) {
    console.log('===== 开始加载MMD模型 =====');
    console.log('模型路径:', modelPath);
    // 显示加载指示器
    showLoadingIndicator();
    
    // 从路径中提取模型名称
    const modelName = modelPath.split('/').pop().split('\\').pop().replace('.pmx', '');
    updateModelInfo(`加载中: ${modelName}`);
    
    // 处理路径，确保与后端API兼容
    let finalPath = processModelPath(modelPath);
    
// 处理模型路径的辅助函数
function processModelPath(path) {
    // 如果路径是相对路径，确保它以正确的方式格式化
    if (!path.startsWith('/') && !path.startsWith('http')) {
        return '/' + path;
    }
    // 确保使用正斜杠
    return path.replace(/\\/g, '/');
}
    
    // 确保使用绝对URL访问后端资源
    if (!finalPath.startsWith('http')) {
      // 使用相对路径，避免硬编码localhost
    finalPath = finalPath;
    }
    
    console.log('处理后的模型路径:', finalPath);
    
    // 移除当前模型
    if (currentModel) {
      scene.remove(currentModel);
      // 清理资源
      currentModel.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(material => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
        if (obj.texture) obj.texture.dispose();
      });
      // 重新初始化helper以避免冲突
      helper = new THREE.MMDAnimationHelper();
      currentModel = null;
    }
    
    try {
      // 简化的加载逻辑，直接尝试加载模型
      const loader = new THREE.MMDLoader();
      
      loader.load(
        finalPath,
        // 成功回调
        function(object) {
          console.log('模型加载成功:', object);
          
          // 缩放模型大小
          const scale = 1.0;
          object.scale.set(scale, scale, scale);
          
          // 计算模型中心点
          const box = new THREE.Box3().setFromObject(object);
          const center = new THREE.Vector3();
          box.getCenter(center);
          
          // 模型居中
          object.position.sub(center);
          
          // 添加到场景
          currentModel = object;
          scene.add(object);
          
          // 关键修复：将模型添加到MMDAnimationHelper中进行正确的材质和光照处理
          // 这是解决模型泛白问题的核心
          try {
              // 使用空对象作为animation参数，避免尝试访问undefined的length属性
              helper.add(object, {
                  animation: {},  // 使用空对象而不是false，避免初始化动画
                  physics: false  // 禁用物理模拟
              });
              console.log('模型已添加到MMDAnimationHelper中');
          } catch (error) {
              console.warn('添加模型到MMDAnimationHelper时出错:', error);
              // 即使出错也继续执行，确保场景能正常显示
          }
          
          // 设置相机位置以完整显示模型
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          cameraZ *= 1.5; // 稍微拉远一点
          camera.position.z = cameraZ;
      
          const minZ = box.min.z;
          const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
          camera.far = cameraToFarEdge * 3;
          camera.updateProjectionMatrix();
          
          // 更新控制器目标
          controls.target.set(0, 0, 0);
          controls.update();
          
          // 更新模型信息
          updateModelInfo(modelName);
          // 隐藏加载指示器
          hideLoadingIndicator();
        },
        // 进度回调 - 现在只在控制台输出
        function(xhr) {
          if (xhr.lengthComputable) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            console.log(`加载进度: ${percent}%`);
          }
        },
        // 错误回调
        function(err) {
          console.error('模型加载错误详情:', err);
          handleError(err, modelPath);
          updateModelInfo(`加载失败: ${modelName}`);
          hideLoadingIndicator();
        }
      );
    } catch (e) {
    handleError(e, modelPath);
    updateModelInfo(`加载失败: ${modelName}`);
    hideLoadingIndicator();
  }
}

function animate() {
  requestAnimationFrame(animate);
  
  controls.update();
  
  // 模型旋转逻辑
  if (isRotating && currentModel) {
    currentModel.rotation.y += rotationSpeed;
  }
  
  if (helper) {
    helper.update(1 / 60);
  }
  
  renderer.render(scene, camera);
}

// 移除了示例场景和路径测试功能

// 注意：自动初始化代码已移除
// 现在应由view.html显式调用init()函数和模型加载函数
// 这样可以避免在模型列表页面(index.html)上出现错误，因为它没有canvas元素

// 移除重复的初始化代码