#version 300 es

// Neuro's Arch Dotfiles — CRT / VHS screen shader for Hyprland.
// Hyprland supplies tex, v_texcoord, and time. This shader needs damage
// tracking disabled so its deliberately slow analogue noise keeps animating.

precision highp float;

in vec2 v_texcoord;
layout(location = 0) out vec4 fragColor;

uniform sampler2D tex;
uniform float time;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

void main() {
    vec2 resolution = vec2(textureSize(tex, 0));
    vec2 pixel = 1.0 / max(resolution, vec2(1.0));
    vec2 uv = v_texcoord;

    // Keep curvature extremely mild. The vignette below darkens the furthest
    // edge by only 5%, so it never creates a distracting dead zone.
    vec2 centered = uv * 2.0 - 1.0;
    float radius2 = dot(centered, centered);
    vec2 curvedUV = centered * (1.0 + 0.020 * radius2);
    curvedUV = curvedUV * 0.5 + 0.5;

    // Slowly travelling tracking bands: 0.4 screen pixels per second keeps the
    // effect alive without looking like a busy full-screen glitch.
    float line = floor(curvedUV.y * resolution.y);
    float movingLine = floor(line + time * 0.4);
    float band = step(0.88, hash(vec2(floor(movingLine / 14.0), 7.0)));
    float tracking = (hash(vec2(floor(movingLine / 5.0), 19.0)) - 0.5)
                   * pixel.x * 5.0 * band;
    vec2 sampleUV = clamp(curvedUV + vec2(tracking, 0.0), vec2(0.0), vec2(1.0));

    // Slight RGB misalignment gives high-contrast edges an analogue bleed.
    float chroma = pixel.x * (1.25 + radius2 * 1.5);
    vec3 color;
    color.r = texture(tex, clamp(sampleUV + vec2(chroma, 0.0), vec2(0.0), vec2(1.0))).r;
    color.g = texture(tex, sampleUV).g;
    color.b = texture(tex, clamp(sampleUV - vec2(chroma, 0.0), vec2(0.0), vec2(1.0))).b;

    // Scanlines, RGB phosphor grille, gently moving luma grain, and a 5%
    // maximum tube vignette. All values are restrained for daily use.
    float scanline = 0.88 + 0.12 * sin(curvedUV.y * resolution.y * 3.14159265);
    float phosphor = 0.96 + 0.04 * sin(curvedUV.x * resolution.x * 2.09439510);
    vec2 grainDrift = vec2(time * 1.20, -time * 0.75);
    float grain = (hash(floor(gl_FragCoord.xy + grainDrift)) - 0.5) * 0.018;
    float vignette = smoothstep(1.35, 0.20, length(centered));
    float edgeDarkening = mix(0.95, 1.0, vignette);
    float trackingGlow = band * (0.012 + 0.018 * hash(vec2(movingLine, 3.0)));

    color *= scanline * phosphor * edgeDarkening;
    color += grain + trackingGlow;
    fragColor = vec4(max(color, vec3(0.0)), 1.0);
}
