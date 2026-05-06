import struct
import json
import math
import os

def generate_brain_glb():
    """
    Anatomically correct brain mesh with:
    - Two clear hemispheres separated by longitudinal fissure
    - Proper side profile: frontal, parietal, temporal, occipital lobes
    - Cerebellum as separate structure
    - Low-poly triangular mesh for clean edge rendering
    """
    
    all_vertices = []
    all_faces = []
    
    def add_mesh(vertices, faces, offset=0):
        start = len(all_vertices)
        all_vertices.extend(vertices)
        all_faces.extend([(f[0]+start, f[1]+start, f[2]+start) for f in faces])
    
    # ── HEMISPHERE FUNCTION ──
    # Generates one hemisphere of the brain
    # side: -1 = left, +1 = right
    def make_hemisphere(side, n_phi=18, n_theta=16):
        """
        One brain hemisphere as a parametric surface.
        phi: 0 (top/medial) to pi (bottom)
        theta: 0 (front) to pi (back) — half rotation only per hemisphere
        """
        vertices = []
        faces = []
        
        def hemi_r(theta, phi):
            """
            Brain hemisphere radius function.
            theta: 0=front, pi=back
            phi: 0=top, pi=bottom
            """
            r = 1.0
            
            # Base hemisphere — flattened on medial side
            # Brain is wider than tall
            
            # Frontal lobe — large forward bulge
            r += 0.28 * math.exp(-((phi - 1.3)**2) / 0.35) * \
                 math.exp(-((theta - 0.22)**2) / 0.45)
            
            # Frontal pole — rounded front
            r += 0.15 * math.exp(-((phi - 1.55)**2) / 0.20) * \
                 math.exp(-((theta - 0.06)**2) / 0.15)
            
            # Parietal lobe — top bulge
            r += 0.18 * math.exp(-((phi - 1.0)**2) / 0.20) * \
                 math.exp(-((theta - 0.65)**2) / 0.50)
            
            # Occipital lobe — back bulge
            r += 0.22 * math.exp(-((phi - 1.45)**2) / 0.22) * \
                 math.exp(-((theta - math.pi * 0.88)**2) / 0.32)
            
            # Temporal lobe — distinctive side/bottom bulge
            # This is the most important for brain recognition
            r += 0.32 * math.exp(-((phi - 1.85)**2) / 0.12) * \
                 math.exp(-((theta - math.pi * 0.38)**2) / 0.25)
            
            # Temporal pole — rounded front-bottom
            r += 0.18 * math.exp(-((phi - 1.95)**2) / 0.10) * \
                 math.exp(-((theta - math.pi * 0.22)**2) / 0.18)
            
            # ── SULCI ──
            # Central sulcus — divides frontal from parietal
            r -= 0.08 * math.exp(-((phi - 1.22)**2) / 0.015) * \
                 math.exp(-((theta - math.pi * 0.45)**2) / 0.70)
            
            # Lateral sulcus (Sylvian fissure) — above temporal
            r -= 0.10 * math.exp(-((phi - 1.68)**2) / 0.010) * \
                 math.exp(-((theta - math.pi * 0.35)**2) / 0.40)
            
            # Parieto-occipital sulcus
            r -= 0.06 * math.exp(-((phi - 1.35)**2) / 0.012) * \
                 math.exp(-((theta - math.pi * 0.72)**2) / 0.20)
            
            # ── GYRI TEXTURE ──
            r += 0.022 * math.sin(5.0 * phi + 0.4) * math.cos(3.5 * theta + 0.8)
            r += 0.015 * math.sin(7.5 * phi) * math.cos(5.5 * theta + 1.2)
            
            return max(0.70, min(1.65, r))
        
        # Scale factors
        # Brain proportions: wider side-side than front-back, flattened medially
        sx = 0.95   # side extent
        sy = 1.05   # height
        sz = 1.20   # front-back depth
        
        # Medial offset — hemispheres sit side by side
        x_offset = side * 0.08  # small gap between hemispheres
        
        # Generate vertex grid
        # phi: 0 (top) to pi*0.85 (bottom, not complete — cerebellum separate)
        # theta: 0 (front) to pi (back) — half hemisphere
        
        phi_max = math.pi * 0.88  # don't go all the way to bottom
        
        vertex_grid = []
        for i in range(n_phi + 1):
            phi = phi_max * i / n_phi
            row = []
            for j in range(n_theta + 1):
                # theta goes 0 to pi (front to back, one hemisphere)
                theta = math.pi * j / n_theta
                
                r = hemi_r(theta, phi)
                
                # Convert to cartesian
                # x: medial(0) to lateral(side)
                # y: top to bottom  
                # z: front to back
                
                x_local = r * sx * math.sin(phi) * side  # lateral extent
                y_local = r * sy * math.cos(phi)          # height
                z_local = r * sz * math.sin(phi) * math.cos(theta)  # front-back
                
                # The medial face needs to be flattened
                # Apply medial flattening based on how "medial" the point is
                # Points facing medially get pushed toward center plane
                medial_factor = math.cos(phi) * 0.3 + 0.7
                
                x_final = x_local * medial_factor + x_offset
                
                row.append((x_final, y_local, z_local))
            vertex_grid.append(row)
        
        # Flatten vertex grid to list
        for row in vertex_grid:
            for v in row:
                # Compute normal (approximate)
                vertices.append(v + (0, 1, 0))  # placeholder normal
        
        # Generate faces
        for i in range(n_phi):
            for j in range(n_theta):
                a = i * (n_theta + 1) + j
                b = a + 1
                c = (i + 1) * (n_theta + 1) + j
                d = c + 1
                # Two triangles per quad
                faces.append((a, c, b))
                faces.append((b, c, d))
        
        # Add medial face (close the flat inner side)
        # Connect top and bottom edges of the medial face
        medial_verts_top = [i * (n_theta + 1) for i in range(n_phi + 1)]
        medial_verts_bot = [(i + 1) * (n_theta + 1) - 1 for i in range(n_phi + 1)]
        
        for i in range(n_phi):
            a = medial_verts_top[i]
            b = medial_verts_top[i + 1]
            c = medial_verts_bot[i]
            d = medial_verts_bot[i + 1]
            faces.append((a, b, c))
            faces.append((b, d, c))
        
        return vertices, faces
    
    def make_cerebellum(n_phi=10, n_theta=14):
        """
        Cerebellum — smaller, rounder structure at back-bottom.
        Distinctive ribbed appearance.
        """
        vertices = []
        faces = []
        
        def cereb_r(theta, phi):
            r = 1.0
            # Rounder than cerebrum
            r += 0.08 * math.cos(8 * phi)  # characteristic folds
            r += 0.06 * math.cos(6 * theta)
            r -= 0.12 * math.exp(-((phi - 0.2)**2) / 0.05)  # flat top
            return max(0.75, min(1.12, r))
        
        # Cerebellum position: back-bottom of brain
        cx, cy, cz = 0.0, -0.85, -0.95  # center position
        rx, ry, rz = 0.62, 0.35, 0.52    # radii
        
        for i in range(n_phi + 1):
            phi = math.pi * i / n_phi
            for j in range(n_theta + 1):
                theta = 2 * math.pi * j / n_theta
                r = cereb_r(theta, phi)
                x = cx + r * rx * math.sin(phi) * math.cos(theta)
                y = cy + r * ry * math.cos(phi)
                z = cz + r * rz * math.sin(phi) * math.sin(theta)
                vertices.append((x, y, z, 0, 1, 0))
        
        for i in range(n_phi):
            for j in range(n_theta):
                a = i * (n_theta + 1) + j
                b = a + 1
                c = (i + 1) * (n_theta + 1) + j
                d = c + 1
                faces.append((a, c, b))
                faces.append((b, c, d))
        
        return vertices, faces
    
    def make_brainstem():
        """
        Brain stem — narrow cylinder connecting cerebellum to rest.
        """
        vertices = []
        faces = []
        
        n_rings = 6
        n_sides = 10
        
        # Stem goes from y=-0.5 to y=-1.2, slightly back
        for i in range(n_rings):
            t = i / (n_rings - 1)
            y = -0.5 - t * 0.7
            z = -0.55 - t * 0.25
            r = 0.18 - t * 0.04  # slight taper
            for j in range(n_sides + 1):
                theta = 2 * math.pi * j / n_sides
                x = r * math.cos(theta)
                z_pt = z + r * 0.3 * math.sin(theta)
                vertices.append((x, y, z_pt, 0, 1, 0))
        
        for i in range(n_rings - 1):
            for j in range(n_sides):
                a = i * (n_sides + 1) + j
                b = a + 1
                c = (i + 1) * (n_sides + 1) + j
                d = c + 1
                faces.append((a, b, c))
                faces.append((b, d, c))
        
        return vertices, faces
    
    print("Generating left hemisphere...")
    lh_verts, lh_faces = make_hemisphere(-1, n_phi=20, n_theta=18)
    add_mesh(lh_verts, lh_faces)
    
    print("Generating right hemisphere...")
    rh_verts, rh_faces = make_hemisphere(1, n_phi=20, n_theta=18)
    add_mesh(rh_verts, rh_faces)
    
    print("Generating cerebellum...")
    cb_verts, cb_faces = make_cerebellum(n_phi=10, n_theta=14)
    add_mesh(cb_verts, cb_faces)
    
    print("Generating brain stem...")
    bs_verts, bs_faces = make_brainstem()
    add_mesh(bs_verts, bs_faces)
    
    print(f"Total vertices: {len(all_vertices)}")
    print(f"Total faces: {len(all_faces)}")
    
    # ── COMPUTE PROPER NORMALS ──
    import numpy as np
    
    verts_arr = [(v[0], v[1], v[2]) for v in all_vertices]
    normals = [[0.0, 0.0, 0.0] for _ in range(len(verts_arr))]
    
    for f in all_faces:
        v0 = verts_arr[f[0]]
        v1 = verts_arr[f[1]]
        v2 = verts_arr[f[2]]
        
        e1 = (v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2])
        e2 = (v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2])
        
        nx = e1[1]*e2[2] - e1[2]*e2[1]
        ny = e1[2]*e2[0] - e1[0]*e2[2]
        nz = e1[0]*e2[1] - e1[1]*e2[0]
        
        for vi in f:
            normals[vi][0] += nx
            normals[vi][1] += ny
            normals[vi][2] += nz
    
    # Normalize
    for i in range(len(normals)):
        n = normals[i]
        length = math.sqrt(n[0]**2 + n[1]**2 + n[2]**2)
        if length > 0:
            normals[i] = [n[0]/length, n[1]/length, n[2]/length]
        else:
            normals[i] = [0, 1, 0]
    
    # ── PACK BINARY DATA ──
    vertex_data = bytearray()
    xs, ys, zs = [], [], []
    
    for i, v in enumerate(verts_arr):
        # Position
        vertex_data += struct.pack('<f', v[0])
        vertex_data += struct.pack('<f', v[1])
        vertex_data += struct.pack('<f', v[2])
        # Normal
        vertex_data += struct.pack('<f', normals[i][0])
        vertex_data += struct.pack('<f', normals[i][1])
        vertex_data += struct.pack('<f', normals[i][2])
        xs.append(v[0]); ys.append(v[1]); zs.append(v[2])
    
    index_data = bytearray()
    for f in all_faces:
        index_data += struct.pack('<I', f[0])
        index_data += struct.pack('<I', f[1])
        index_data += struct.pack('<I', f[2])
    
    while len(vertex_data) % 4 != 0: vertex_data += b'\x00'
    while len(index_data) % 4 != 0: index_data += b'\x00'
    
    buffer_data = bytes(vertex_data) + bytes(index_data)
    
    # ── GLTF JSON ──
    gltf = {
        "asset": {"version": "2.0", "generator": "JARVIS-I Brain v2"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Brain"}],
        "meshes": [{
            "name": "Brain",
            "primitives": [{
                "attributes": {"POSITION": 0, "NORMAL": 1},
                "indices": 2,
                "material": 0,
                "mode": 4
            }]
        }],
        "accessors": [
            {
                "bufferView": 0, "byteOffset": 0,
                "componentType": 5126, "count": len(verts_arr),
                "type": "VEC3",
                "max": [max(xs), max(ys), max(zs)],
                "min": [min(xs), min(ys), min(zs)]
            },
            {
                "bufferView": 0, "byteOffset": 12,
                "componentType": 5126, "count": len(verts_arr),
                "type": "VEC3"
            },
            {
                "bufferView": 1, "byteOffset": 0,
                "componentType": 5125, "count": len(all_faces) * 3,
                "type": "SCALAR"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0, "byteOffset": 0,
                "byteLength": len(vertex_data),
                "byteStride": 24, "target": 34962
            },
            {
                "buffer": 0, "byteOffset": len(vertex_data),
                "byteLength": len(index_data), "target": 34963
            }
        ],
        "buffers": [{"byteLength": len(buffer_data)}],
        "materials": [{
            "name": "Brain",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.8, 0.6, 0.1, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.9
            },
            "doubleSided": True
        }]
    }
    
    json_str = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(json_str) % 4 != 0: json_str += b' '
    
    total_length = 12 + 8 + len(json_str) + 8 + len(buffer_data)
    
    glb = bytearray()
    glb += struct.pack('<I', 0x46546C67)
    glb += struct.pack('<I', 2)
    glb += struct.pack('<I', total_length)
    glb += struct.pack('<I', len(json_str))
    glb += struct.pack('<I', 0x4E4F534A)
    glb += json_str
    glb += struct.pack('<I', len(buffer_data))
    glb += struct.pack('<I', 0x004E4942)
    glb += buffer_data
    
    out_path = r'C:\Users\brist\jarvis-i\frontend\public\brain\Brain.glb'
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'wb') as f:
        f.write(glb)
    
    print(f"\n✅ Brain.glb saved: {out_path}")
    print(f"   Size: {len(glb)/1024:.1f} KB")

generate_brain_glb()