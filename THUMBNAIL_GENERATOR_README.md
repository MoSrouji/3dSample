# 3D Model Thumbnail Generator

Auto-generate high-quality thumbnails for all 3D models in your GLB collection.

## Quick Start

### Prerequisites
- Node.js 14+ installed
- npm or yarn

### Installation & Setup

1. **Install dependencies:**
```bash
npm install
```

This will install Puppeteer, which handles headless browser rendering for 3D model screenshots.

2. **Generate thumbnails:**
```bash
npm run generate
```

### How It Works

1. **Reads** `index.json` to get all model URLs
2. **Renders** each GLB model using Three.js in a headless browser
3. **Captures** high-quality PNG screenshots (256×256px)
4. **Saves** thumbnails to the `./thumbnails/` directory
5. **Displays** progress and statistics

### Output

Generated thumbnails will be saved as:
```
thumbnails/
├── beating_heart.png
├── gear.png
├── offshore_wind_turbine.png
├── mobile_robotic_arm.png
└── ... (all models)
```

### Features

✅ **Automatic centering** - Models are auto-centered and scaled in frame  
✅ **Professional lighting** - Ambient and directional lights for realistic rendering  
✅ **Optimized rendering** - 256×256px PNGs with 85% quality  
✅ **Error handling** - Graceful fallback if a model fails  
✅ **Progress tracking** - Real-time feedback during generation  

### Performance

- **Time per model:** ~2-5 seconds (depends on model complexity)
- **Total time:** ~3-5 minutes for all 40+ models
- **File size:** ~20-50KB per thumbnail

### Using Generated Thumbnails in Kotlin/Compose

Reference the thumbnails in your CDN:

```kotlin
val thumbnailUrl = "https://cdn.jsdelivr.net/gh/MoSrouji/3dSample@master/thumbnails/${modelName}.png"

Image(
    painter = rememberAsyncImagePainter(thumbnailUrl),
    contentDescription = modelName,
    modifier = Modifier.size(200.dp),
    contentScale = ContentScale.Crop
)
```

### Troubleshooting

**"Puppeteer not found"**
```bash
npm install puppeteer
```

**Models rendering as blank**
- Ensure model URLs are accessible
- Check browser console for CORS issues
- Verify Three.js CDN is available

**Out of memory errors**
- Reduce batch size (modify script to process 5-10 models at a time)
- Increase Node heap: `node --max-old-space-size=4096 generateThumbnails.js`

### Advanced Usage

Modify `generateThumbnails.js` to customize:
- **Thumbnail size:** Change `256` to desired dimensions
- **Camera position:** Adjust `camera.position.z * 1.5`
- **Lighting:** Modify light intensity and position values
- **Background color:** Change `0xf0f0f0` hex value

### License

MIT
