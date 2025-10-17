import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { MMDToonShader } from 'three/examples/jsm/shaders/MMDToonShader.js';
import JSZip from 'jszip';

// 检查Three.js版本
console.log('Three.js版本:', THREE.REVISION);

console.log('MMDLoader模块导入成功:', typeof MMDLoader);
console.log('MMDAnimationHelper模块导入成功:', typeof MMDAnimationHelper);

// 初始化场景
let scene, camera, renderer, controls;
let currentModel = null;
let helper = null;

function init() {
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
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  // 启用阴影
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 设置渲染器伽马值以改善色彩
  renderer.gammaOutput = true;
  renderer.gammaFactor = 2.2;
  // 增强渲染质量和对比度
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearAlpha(1);
  
  // 添加环境光 - 增强整体对比度
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambientLight);
  
  // 添加主光源 - 增强方向性和阴影效果
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(2, 1.5, 1);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 4096; // 提高阴影分辨率
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  directionalLight.shadow.radius = 2;
  scene.add(directionalLight);
  
  // 添加柔和的补光 - 增强细节可见性
  const fillLight = new THREE.DirectionalLight(0xe6f2ff, 0.25);
  fillLight.position.set(-2, 1, -1);
  scene.add(fillLight);
  
  // 添加底部柔和光源，避免过暗阴影
  const bottomLight = new THREE.DirectionalLight(0xfff0e6, 0.2);
  bottomLight.position.set(0, -1, 0);
  scene.add(bottomLight);
  
  // 添加轮廓增强光 - 专门用于增强远距离观看时的线条感
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(-1, 0, 1);
  scene.add(rimLight);
  
  // 移除了辅助网格，简化显示效果
  
  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // 初始化动画助手
  helper = new MMDAnimationHelper();
  
  // 创建轮廓线渲染器
  let outlinePass;
  // 保存对轮廓线渲染器的引用
  window.outlinePass = outlinePass;
  
  // 添加窗口大小调整监听
  window.addEventListener('resize', onWindowResize);
  
  // 绑定模型选择事件
  const loadModelButton = document.getElementById('load-model');
  if (loadModelButton) {
    loadModelButton.addEventListener('click', loadSelectedModel);
    console.log('成功绑定模型选择事件');
  } else {
    console.warn('未找到load-model元素，跳过事件绑定');
  }
  
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
    async function extractAndLoadModelFromZip(zipPath) {
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
            const loader = new MMDLoader();
            
            // 配置MMDLoader的材质选项
            loader.setAnimationHelper(helper);
            loader.pmxUserExtension = true;
            
            try {
                // 从ArrayBuffer加载模型
                const object = loader.parse(pmxContent, '');
                console.log('模型解析成功，对象类型:', object.type);
                
                // 为模型添加轮廓线效果
                addOutlineToModel(object);
                
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
    const loadModelButton2 = document.getElementById('load-model');
    if (loadModelButton2) {
        loadModelButton2.addEventListener('click', function() {
            console.log('加载模型按钮被点击');
            const selectedModelElement = document.getElementById('models');
            if (selectedModelElement) {
                const selectedModel = selectedModelElement.value;
        console.log('加载模型按钮选择的值:', selectedModel);
                loadMMDModel(selectedModel);
            } else {
                console.warn('未找到models选择元素');
            }
        });
    } else {
        console.warn('未找到load-model按钮元素，跳过事件绑定');
    }
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
        } else if (document.getElementById('models')) {
            // 如果没有URL参数且有模型选择器，加载默认模型
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadSelectedModel() {
  console.log('模型选择按钮被点击');
  const modelSelect = document.getElementById('models');
  const modelName = modelSelect.value;
  console.log('选择的模型名称:', modelName);
  const modelPath = `MMD/model/${modelName}`;
  console.log('将加载模型路径:', modelPath);
  loadMMDModel(modelPath);
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

async function loadMMDModel(modelPath) {
    console.log('===== 开始加载MMD模型 =====');
    console.log('模型路径:', modelPath);
    // 显示加载指示器
    showLoadingIndicator();
    
    // 从路径中提取模型名称
    const modelName = modelPath.split('/').pop().split('\\').pop().replace('.pmx', '');
    updateModelInfo(`加载中: ${modelName}`);
    
    // 处理路径，确保与后端API兼容
    let finalPath = processModelPath(modelPath);
    
    // 确保使用绝对URL访问后端资源
    if (!finalPath.startsWith('http')) {
      // 使用相对路径，避免硬编码localhost
    finalPath = finalPath;
    }
    
    console.log('处理后的模型路径:', finalPath);
    
    // 移除当前模型
    if (currentModel) {
      scene.remove(currentModel);
      helper.reset();
      currentModel = null;
    }
    
    try {
      // 简化的加载逻辑，直接尝试加载模型
      const loader = new MMDLoader();
      
      // 配置MMDLoader的材质选项
      loader.setAnimationHelper(helper);
      loader.pmxUserExtension = true;
      
      loader.load(
        finalPath,
        // 成功回调
        function(object) {
          console.log('模型加载成功:', object);
          
          // 为模型添加轮廓线效果
          addOutlineToModel(object);
          
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

// 为模型添加轮廓线效果的函数 - 增强远距离观看效果
function addOutlineToModel(model) {
  console.log('为模型添加增强版轮廓线效果');
  
  // 为场景添加全局后处理效果 - 简化的SSAO效果来增强立体感
  addSimpleSSAO(scene);
  
  // 遍历模型中的所有网格
  model.traverse(function(child) {
    if (child.isMesh) {
      // 克隆原始几何体，避免修改原对象
      const originalGeometry = child.geometry.clone();
      const originalMaterial = child.material.clone();
      
      // 增加轮廓线宽度 - 远距离观看时更明显
      const outlineScale = 1.06; // 显著增加轮廓宽度
      
      // 创建更强的轮廓线材质 - 增强远距离可见性
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,  // 黑色轮廓线
        side: THREE.BackSide,
        depthTest: true,
        depthWrite: false,
        opacity: 1.0,
        transparent: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
      
      // 创建原始网格和轮廓网格
      const innerMesh = new THREE.Mesh(originalGeometry, originalMaterial);
      const outlineMesh = new THREE.Mesh(originalGeometry, outlineMaterial);
      
      // 放大轮廓网格
      outlineMesh.scale.multiplyScalar(outlineScale);
      
      // 创建带有轮廓线的组
      const meshWithOutline = new THREE.Group();
      meshWithOutline.add(innerMesh);
      meshWithOutline.add(outlineMesh);
      
      // 替换原始网格
      const parent = child.parent;
      if (parent) {
        const index = parent.children.indexOf(child);
        parent.remove(child);
        parent.add(meshWithOutline);
        
        // 复制位置、旋转和缩放
        meshWithOutline.position.copy(child.position);
        meshWithOutline.rotation.copy(child.rotation);
        meshWithOutline.scale.copy(child.scale);
      }
      
      // 增强材质参数以提高远距离观看效果
      if (originalMaterial.isMaterial) {
        // 为皮肤材质应用特殊处理
        const textureName = child.material.map ? child.material.map.name : '';
        const isSkinMaterial = textureName.toLowerCase().includes('肌') || 
                              textureName.toLowerCase().includes('skin') ||
                              textureName.toLowerCase().includes('肌1') ||
                              textureName.toLowerCase().includes('肌2') ||
                              textureName.toLowerCase().includes('skin.bmp');
        
        if (isSkinMaterial) {
          // 皮肤材质特殊处理 - 增强远距离观看效果
          if (originalMaterial.color) {
            const hsl = { h: 0, s: 0, l: 0 };
            originalMaterial.color.getHSL(hsl);
            hsl.h = Math.max(hsl.h - 0.03, 0); // 更偏粉色调
            hsl.s = Math.min(hsl.s * 1.8, 1.0); // 显著增加饱和度
            hsl.l = Math.max(hsl.l * 0.85, 0.0); // 降低亮度增强对比度
            originalMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);
          }
          
          // 增强皮肤质感和立体感
          if (originalMaterial.specular) {
            originalMaterial.specular.set(0x555555);
            originalMaterial.shininess = 10;
          }
          
          // 增加皮肤材质的不透明度，确保颜色更浓郁
          originalMaterial.opacity = 1.0;
          originalMaterial.transparent = false;
        } else {
          // 非皮肤材质处理 - 增强远距离对比度
          if (originalMaterial.color) {
            const hsl = { h: 0, s: 0, l: 0 };
            originalMaterial.color.getHSL(hsl);
            hsl.s = Math.min(hsl.s * 1.5, 1.0); // 显著增加饱和度
            hsl.l = Math.max(hsl.l * 0.85, 0.0); // 降低亮度增强对比度
            originalMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);
          }
          
          // 增强材质反光度
          if (originalMaterial.specular) {
            originalMaterial.specular.set(0x444444);
            originalMaterial.shininess = 8;
          }
        }
        
        // 为所有材质启用阴影接收和投射
        originalMaterial.receiveShadow = true;
        originalMaterial.castShadow = true;
        
        // 增强材质的清晰度和可见性
        originalMaterial.polygonOffset = true;
        originalMaterial.polygonOffsetFactor = -1;
        originalMaterial.polygonOffsetUnits = -1;
      }
    }
  });
  
  console.log('增强版轮廓线效果添加完成');
}

// 添加简单的环境光遮蔽效果以增强立体感
function addSimpleSSAO(scene) {
  console.log('添加简单环境光遮蔽效果');
  
  // 添加定向阴影光以增强边缘感
  const shadowLight = new THREE.DirectionalLight(0x000000, 0.2);
  shadowLight.position.set(-2, -1, -1);
  shadowLight.castShadow = false;
  scene.add(shadowLight);
  
  // 添加额外的边缘增强光
  const edgeLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.1);
  scene.add(edgeLight);
}

function animate() {
  requestAnimationFrame(animate);
  
  controls.update();
  
  if (helper) {
    helper.update(1 / 60);
  }
  
  renderer.render(scene, camera);
}

// 移除了示例场景和路径测试功能

window.addEventListener('load', async () => {
  console.log('页面加载完成，开始初始化...');
  
  try {
    // 先初始化场景
    init();
    console.log('场景初始化完成');
    
    // 测试用ZIP文件路径 - 使用最简单的路径格式
    const testZipPath = 'MMD/【模之屋】雷电将军_by_原神_535ff740fe45cbd49822311479d93d94.zip';
    
    // 立即执行，不需要延迟
    console.log('开始测试加载ZIP模型:', testZipPath);
    if (window.extractAndLoadModelFromZip) {
      await window.extractAndLoadModelFromZip(testZipPath);
      console.log('ZIP模型加载函数调用完成');
    } else {
      console.warn('extractAndLoadModelFromZip函数未定义，跳过模型加载');
    }
  } catch (error) {
    console.error('初始化或模型加载错误:', error);
  }
});

// 移除重复的初始化代码