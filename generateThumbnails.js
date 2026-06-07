const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const indexJson = require('./index.json');
const baseUrl = indexJson.baseUrl;
const outputDir = './thumbnails';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create HTML file for headless rendering
const htmlTemplate = (modelUrl) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background: #f0f0f0; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@r128/examples/js/loaders/GLTFLoader.js"></script>
    
    <script>
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(256, 256);
        renderer.setPixelRatio(1);
        document.body.appendChild(renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);
        
        const loader = new THREE.GLTFLoader();
        
        function generateScreenshot() {
            return renderer.domElement.toDataURL('image/png');
        }
        
        loader.load('${modelUrl}', (gltf) => {
            const model = gltf.scene;
            scene.add(model);
            
            // Auto-center and scale
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            model.position.sub(center);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            
            camera.position.z = cameraZ * 1.5;
            camera.lookAt(0, 0, 0);
            
            // Render multiple times to ensure everything is loaded
            for (let i = 0; i < 5; i++) {
                renderer.render(scene, camera);
            }
            
            const pngData = generateScreenshot();
            window.screenshotData = pngData;
        }, undefined, (error) => {
            console.error('Model load error:', error);
            window.screenshotData = null;
        });
    </script>
</body>
</html>
`;

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location).then(resolve).catch(reject);
            } else if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
            } else {
                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
            }
        }).on('error', reject);
    });
}

async function generateThumbnail(modelName, modelPath) {
    try {
        const modelUrl = `${baseUrl}/${modelPath}`;
        console.log(`⏳ Generating thumbnail for ${modelName}...`);
        
        // Create temporary HTML file
        const tempHtmlPath = path.join(outputDir, `temp_${modelName}.html`);
        fs.writeFileSync(tempHtmlPath, htmlTemplate(modelUrl));
        
        // Use Puppeteer if available, otherwise try alternative
        try {
            const puppeteer = require('puppeteer');
            
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setViewport({ width: 256, height: 256 });
            await page.goto(`file://${path.resolve(tempHtmlPath)}`, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Wait for screenshot data
            await page.waitForFunction(() => window.screenshotData, { timeout: 10000 }).catch(() => {});
            
            const screenshotBase64 = await page.evaluate(() => {
                if (window.screenshotData) {
                    return window.screenshotData.replace('data:image/png;base64,', '');
                }
                // Fallback: take screenshot if data not available
                return null;
            });
            
            if (!screenshotBase64) {
                // Take fallback screenshot
                const screenshot = await page.screenshot({ encoding: 'base64' });
                fs.writeFileSync(
                    path.join(outputDir, `${modelName}.png`),
                    Buffer.from(screenshot, 'base64')
                );
            } else {
                fs.writeFileSync(
                    path.join(outputDir, `${modelName}.png`),
                    Buffer.from(screenshotBase64, 'base64')
                );
            }
            
            await browser.close();
            fs.unlinkSync(tempHtmlPath);
            
            console.log(`✓ ${modelName}.png created`);
            return true;
        } catch (error) {
            console.error(`  Puppeteer not available or error: ${error.message}`);
            console.log(`  Install puppeteer: npm install puppeteer`);
            return false;
        }
    } catch (error) {
        console.error(`✗ Error generating ${modelName}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🎬 Starting thumbnail generation...\n');
    
    const models = Object.entries(indexJson.models);
    let successCount = 0;
    let failureCount = 0;
    
    for (const [modelName, modelPath] of models) {
        const success = await generateThumbnail(modelName, modelPath);
        if (success) successCount++;
        else failureCount++;
    }
    
    console.log(`\n✅ Generation complete!`);
    console.log(`📊 Success: ${successCount}, Failed: ${failureCount}\n`);
}

main().catch(console.error);
