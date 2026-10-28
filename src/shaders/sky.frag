#version 450

layout(location = 0) out vec4 outColor;

void main() {
    float height = gl_FragCoord.y / 1080.0; 

    // sky colors 
    vec3 zenithColor = vec3(0.1, 0.3, 0.6);
    vec3 horizonColor = vec3(0.7, 0.8, 0.9);

    // smooth gradient
    float t = clamp(height * 1.5, 0.0, 1.0);
    vec3 skyColor = mix(horizonColor, zenithColor, t);

    outColor = vec4(skyColor, 1.0);
}