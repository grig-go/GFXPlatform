---
sidebar_position: 2
---

# vMix Integration

Integrate Nova GFX with vMix for professional broadcast production.

## Web Browser Input

### Setup

1. In vMix, add a **Web Browser** input
2. Enter the Nova GFX preview URL
3. Set width and height to match canvas
4. Enable alpha channel for transparency

### URL Format

```
http://localhost:5173/preview?template={id}&obs=1&bg=transparent
```

## vMix Call Integration

### Triggering via HTTP API

vMix can call Nova GFX endpoints:

```xml
<!-- vMix Macro to play IN -->
<Input>
  <Function>ScriptStart</Function>
  <Value>PlayNovaIn</Value>
</Input>
```

### Script Example

```vb
' VBScript for vMix
Dim xhr
Set xhr = CreateObject("MSXML2.XMLHTTP")
xhr.Open "POST", "http://localhost:5173/api/preview/playIn", False
xhr.Send
```

## GT Overlay Comparison

| Feature | Nova GFX | vMix GT |
|---------|----------|---------|
| Animation | Full keyframe | Limited |
| Elements | Many types | Basic |
| Maps | Yes (Mapbox) | No |
| Charts | Yes (Chart.js) | No |
| Customization | Full | Template-based |

## Multi-Layer Setup

Add multiple Web Browser inputs:
- Input 1: Lower thirds template
- Input 2: Bug template
- Input 3: Full screen template

Control each independently.

## Best Practices

- Enable GPU acceleration in vMix
- Use appropriate resolution inputs
- Test with production workload
- Monitor system resources
