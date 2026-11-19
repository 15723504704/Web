/**
 * StarField - 星空粒子背景系统
 * 负责创建多层星空粒子、隧道效果和环境雾气
 */
(function(global) {
  'use strict';

  class StarField {
    constructor(scene) {
      this.scene = scene;
      this.starLayers = [];
      this.tunnelRings = [];
      this.fogColor = new THREE.Color(0x050820);
      this.init();
    }

    init() {
      // 创建3层不同密度/速度的星空粒子
      this.createStarLayer(2000, 0.3, 0xffffff, 800, 400); // 远景
      this.createStarLayer(1000, 0.6, 0xaaddff, 500, 250); // 中景
      this.createStarLayer(500, 1.0, 0x00e5ff, 300, 150);  // 近景

      // 创建隧道环
      this.createTunnelRings(40);

      // 添加雾效
      this.scene.fog = new THREE.FogExp2(this.fogColor, 0.008);
    }

    createStarLayer(count, size, color, spread, speed) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const c = new THREE.Color(color);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        // 球形分布
        const radius = spread * (0.5 + Math.random() * 0.5);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = -radius * Math.cos(phi) - 200; // 偏移到前方

        // 颜色带一点随机变化
        const variation = 0.7 + Math.random() * 0.3;
        colors[i3] = c.r * variation;
        colors[i3 + 1] = c.g * variation;
        colors[i3 + 2] = c.b * variation;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: size,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geometry, material);
      this.scene.add(points);
      this.starLayers.push({ points, speed, spread });
    }

    createTunnelRings(count) {
      const ringGeometry = new THREE.TorusGeometry(12, 0.15, 8, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      for (let i = 0; i < count; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        ring.position.z = -i * 80 - 100;
        ring.rotation.z = Math.random() * Math.PI;
        ring.material.opacity = 0.15 + Math.random() * 0.25;
        // 随机变化大小
        const scale = 0.8 + Math.random() * 0.5;
        ring.scale.set(scale, scale, 1);
        // 颜色微调
        const hue = Math.random() * 0.2;
        ring.material.color.setHSL(0.5 + hue, 1, 0.6);
        this.scene.add(ring);
        this.tunnelRings.push({ mesh: ring, z: ring.position.z, rotSpeed: (Math.random() - 0.5) * 0.002 });
      }
    }

    update(deltaTime, baseSpeed) {
      // 更新各层星空位置（产生飞行感）
      this.starLayers.forEach((layer, index) => {
        const positions = layer.points.geometry.attributes.position.array;
        const speed = layer.speed * baseSpeed * 0.02 * (index + 1);

        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 2] += speed;

          // 循环：当粒子飞到相机后面，重新放到远处
          if (positions[i + 2] > 50) {
            const radius = layer.spread * (0.5 + Math.random() * 0.5);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = -layer.spread - 200;
          }
        }
        layer.points.geometry.attributes.position.needsUpdate = true;
      });

      // 更新隧道环
      const ringSpeed = baseSpeed * 0.5;
      this.tunnelRings.forEach(ring => {
        ring.z += ringSpeed * deltaTime * 60;
        ring.mesh.position.z = ring.z;
        ring.mesh.rotation.z += ring.rotSpeed;

        // 循环
        if (ring.z > 20) {
          ring.z = -this.tunnelRings.length * 80 - 100 + ring.z % 20;
          // 重新随机一些属性
          const scale = 0.8 + Math.random() * 0.5;
          ring.mesh.scale.set(scale, scale, 1);
          ring.mesh.material.opacity = 0.15 + Math.random() * 0.25;
        }

        // 距离相机越近越亮
        const dist = Math.abs(ring.z);
        if (dist < 200) {
          ring.mesh.material.opacity = Math.min(0.5, 0.5 * (1 - dist / 200));
        }
      });
    }

    setSpeedFactor(factor) {
      // 加速时可以让隧道环更亮
      this.tunnelRings.forEach(ring => {
        ring.mesh.material.color.setHSL(0.5 + factor * 0.1, 1, 0.5 + factor * 0.2);
      });
    }

    dispose() {
      this.starLayers.forEach(layer => {
        layer.points.geometry.dispose();
        layer.points.material.dispose();
        this.scene.remove(layer.points);
      });
      this.tunnelRings.forEach(ring => {
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        this.scene.remove(ring.mesh);
      });
      this.starLayers = [];
      this.tunnelRings = [];
    }
  }

  global.StarField = StarField;
})(window);
