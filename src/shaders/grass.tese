#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(quads, equal_spacing, ccw) in;

layout(set = 0, binding = 0) uniform CameraBufferObject {
    mat4 view;
    mat4 proj;
} camera;

// TODO: Declare tessellation evaluation shader inputs and outputs

layout(location = 0) in vec4 inV0[];
layout(location = 1) in vec4 inV1[];
layout(location = 2) in vec4 inV2[];
layout(location = 3) in vec4 inUp[];

layout(location = 0) out vec3 fragNormal;
layout(location = 1) out float fragHeight;
layout(location = 2) out vec3 fragWorldPos;

vec3 bezier(vec3 p0, vec3 p1, vec3 p2, float t) {
    return (1 - t)* (1 - t) * p0 
    + 2.0 * (1 - t) * t * p1 
    + t * t * p2;
}

vec3 bezierDeriv(vec3 p0, vec3 p1, vec3 p2, float t) {
    return 2.0 * (1 - t) * (p1 - p0) + 2.0 * t * (p2 - p1);
}

void main() {
    float u = gl_TessCoord.x;
    float v = gl_TessCoord.y;

	// TODO: Use u and v to parameterize along the grass blade and output positions for each vertex of the grass blade

    vec4 v0 = inV0[0];
    vec4 v1 = inV1[0];
    vec4 v2 = inV2[0];
    vec4 up = inUp[0];

    // curve pos & tangent
    vec3 pos = bezier(v0.xyz, v1.xyz, v2.xyz, v);
    vec3 tangent = normalize(bezierDeriv(v0.xyz, v1.xyz, v2.xyz, v));

    // face dir
    vec3 faceDir = vec3(cos(v0.w), 0.0, sin(v0.w));
    vec3 normal = cross(faceDir, tangent);
    if (length(normal) < 0.001) {
        normal = vec3(0.0, 1.0, 0.0);
    } else {
        normal = normalize(normal);
    }

    // push vertex sideways
    vec3 finalPos = pos + (u - 0.5) * v2.w * pow(1.0 - v, 1.5) * faceDir;

    gl_Position = camera.proj * camera.view * vec4(finalPos, 1.0);
    fragNormal = normal;
    fragHeight = v;
    fragWorldPos = finalPos;
}
