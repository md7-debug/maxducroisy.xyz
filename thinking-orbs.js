/*
 * Dotted orb renderer adapted from Jakub Antalik's thinking-orbs project.
 * Source: https://github.com/Jakubantalik/thinking-orbs
 * MIT License. See THIRD_PARTY_NOTICES.md.
 *
 * The renderer keeps the original project's defining ideas: projected 3D
 * point fields, depth expressed through dot size and ink weight, and one
 * lightweight 2D canvas with no WebGL or filters.
 */
(global => {
  'use strict';

  const TAU = Math.PI * 2;

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function fraction(value) {
    return value - Math.floor(value);
  }

  function hashD(a, b) {
    const hash = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return fraction(hash);
  }

  function valueNoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let fx = x - xi;
    let fy = y - yi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = hashD(xi, yi);
    const b = hashD(xi + 1, yi);
    const c = hashD(xi, yi + 1);
    const d = hashD(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  function fibonacciDirection(index, count) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - (2 * (index + 0.5)) / count;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * golden;
    return [radius * Math.cos(angle), y, radius * Math.sin(angle)];
  }

  function angleDelta(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function makeProjection(yaw, tilt, centerX, centerY, scale) {
    const sinTilt = Math.sin(tilt);
    const cosTilt = Math.cos(tilt);
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    return (x, y, z) => {
      const rotatedX = x * cosYaw + z * sinYaw;
      const rotatedZ = -x * sinYaw + z * cosYaw;
      const rotatedY = y * cosTilt - rotatedZ * sinTilt;
      const depth = y * sinTilt + rotatedZ * cosTilt;
      return [centerX + rotatedX * scale, centerY - rotatedY * scale, depth];
    };
  }

  function radiusScale(size, power = 0.5) {
    return (size / 300) ** power;
  }

  function paintDots(context, dots, color, minimumRadius = 0.3) {
    dots.sort((a, b) => a.z - b.z);
    for (const dot of dots) {
      const baseAlpha = dot.a ?? 1;
      if (baseAlpha < 0.02) continue;
      const depthInk = clamp(1 - dot.white);
      const alpha = baseAlpha * (0.7 + depthInk * 0.3);
      const dotColor = dot.accent || color;
      const lift = depthInk * 0.24;
      const red = Math.round(lerp(dotColor[0], 255, lift));
      const green = Math.round(lerp(dotColor[1], 246, lift));
      const blue = Math.round(lerp(dotColor[2], 238, lift));
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      context.beginPath();
      context.arc(dot.x, dot.y, Math.max(minimumRadius, dot.r), 0, TAU);
      context.fill();
    }
  }

  function paintLines(context, lines, color) {
    for (const line of lines) {
      if (line.a < 0.02) continue;
      context.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${line.a})`;
      context.lineWidth = line.width;
      context.beginPath();
      context.moveTo(line.x1, line.y1);
      context.lineTo(line.x2, line.y2);
      context.stroke();
    }
  }

  function drawWorking(context, size, time, color, accent) {
    const center = size / 2;
    const radius = center * 0.82;
    const project = makeProjection(time * 0.12, 0.3, center, center, 1);
    const scale = radiusScale(size);
    const dots = [];
    const orbitCount = size < 22 ? 5 : 9;
    const ghostCount = size < 22 ? 12 : 22;

    for (let orbit = 0; orbit < orbitCount; orbit += 1) {
      const h1 = hashD(orbit, 1.7);
      const h2 = hashD(orbit, 5.2);
      const h3 = hashD(orbit, 8.9);
      const orbitRadius = radius * (0.45 + 0.52 * h1);
      const theta = h1 * TAU;
      const phi = Math.acos(2 * h2 - 1);
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      let ux = -ny;
      let uy = nx;
      const uz = 0;
      const length = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
      ux /= length;
      uy /= length;
      const vx = ny * uz - nz * uy;
      const vy = nz * ux - nx * uz;
      const vz = nx * uy - ny * ux;
      const speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);

      for (let point = 0; point < ghostCount; point += 1) {
        const angle = (point / ghostCount) * TAU;
        const [x, y, z] = project(
          (ux * Math.cos(angle) + vx * Math.sin(angle)) * orbitRadius,
          (uy * Math.cos(angle) + vy * Math.sin(angle)) * orbitRadius,
          (uz * Math.cos(angle) + vz * Math.sin(angle)) * orbitRadius,
        );
        const depth = (z / orbitRadius + 1) / 2;
        dots.push({ x, y, z, r: 1.52 * scale, white: 0.56, a: 0.98 * (0.76 + 0.24 * depth) });
      }

      const angle = time * speed + h2 * 6;
      const [x, y, z] = project(
        (ux * Math.cos(angle) + vx * Math.sin(angle)) * orbitRadius,
        (uy * Math.cos(angle) + vy * Math.sin(angle)) * orbitRadius,
        (uz * Math.cos(angle) + vz * Math.sin(angle)) * orbitRadius,
      );
      const depth = (z / orbitRadius + 1) / 2;
      dots.push({
        x,
        y,
        z,
        r: (1.8 + 2.1 * depth) * scale,
        white: 0.22 - 0.18 * depth,
        accent: orbit % 3 === 0 ? accent : null,
      });
    }

    paintDots(context, dots, color, 0.82);
  }

  function drawSearching(context, size, time, color) {
    const center = size / 2;
    const radius = center * 0.82;
    const spin = 0.5;
    const project = makeProjection(time * spin, 0.4 + 0.06 * Math.sin(time * 0.35), center, center, radius);
    const scan = time * 1.7;
    const scale = radiusScale(size);
    const dots = [];
    const latitudeRings = size < 18 ? 6 : 9;
    const longitudeDensity = size < 18 ? 14 : 22;

    for (let latitudeIndex = 0; latitudeIndex <= latitudeRings; latitudeIndex += 1) {
      const latitude = -Math.PI / 2 + (latitudeIndex / latitudeRings) * Math.PI;
      const cosLatitude = Math.cos(latitude);
      const sinLatitude = Math.sin(latitude);
      const longitudeCount = Math.max(1, Math.round(Math.abs(cosLatitude) * longitudeDensity));

      for (let longitudeIndex = 0; longitudeIndex < longitudeCount; longitudeIndex += 1) {
        const longitude = (longitudeIndex / longitudeCount) * TAU;
        const [x, y, z] = project(
          cosLatitude * Math.cos(longitude),
          sinLatitude,
          cosLatitude * Math.sin(longitude),
        );
        const depth = (z + 1) / 2;
        const distance = angleDelta(longitude + time * spin, scan);
        const boost = Math.exp(-(distance * distance) / 0.18) * Math.max(0, z);
        dots.push({
          x,
          y,
          z,
          r: (0.64 + 1.72 * depth + boost) * scale,
          white: 0.62 - 0.54 * depth,
          a: 0.56 + 0.44 * Math.min(1, boost),
        });
      }
    }

    paintDots(context, dots, color, 0.5);
  }

  function drawConnecting(context, size, time, color, accent) {
    const center = size / 2;
    const radius = center * 0.8;
    const project = makeProjection(time * 0.12, 0.32, center, center, radius);
    const scale = radiusScale(size);
    const nodeCount = size < 18 ? 8 : 13;
    const threshold = 0.92;
    const nodes = [];
    const dots = [];
    const lines = [];

    for (let index = 0; index < nodeCount; index += 1) {
      const direction = fibonacciDirection(index, nodeCount);
      const x = direction[0] + 0.3 * (valueNoise(index * 0.31 + 9, time * 0.24) - 0.5) * 2;
      const y = direction[1] + 0.3 * (valueNoise(index * 0.53 + 27, time * 0.21) - 0.5) * 2;
      const z = direction[2] + 0.3 * (valueNoise(index * 0.77 + 55, time * 0.27) - 0.5) * 2;
      const length = Math.sqrt(x * x + y * y + z * z);
      nodes.push([x / length, y / length, z / length]);
    }

    for (let first = 0; first < nodeCount; first += 1) {
      for (let second = first + 1; second < nodeCount; second += 1) {
        const dx = nodes[first][0] - nodes[second][0];
        const dy = nodes[first][1] - nodes[second][1];
        const dz = nodes[first][2] - nodes[second][2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance >= threshold) continue;
        const [x1, y1, z1] = project(...nodes[first]);
        const [x2, y2, z2] = project(...nodes[second]);
        const depth = ((z1 + z2) / 2 + 1) / 2;
        lines.push({
          x1,
          y1,
          x2,
          y2,
          a: (1 - distance / threshold) * (0.38 + 0.58 * depth),
          width: Math.max(0.55, 0.88 * scale),
        });
      }
    }

    nodes.forEach((node, index) => {
      const [x, y, z] = project(...node);
      const depth = (z + 1) / 2;
      dots.push({
        x,
        y,
        z,
        r: (1.35 + 1.8 * depth) * (1 + 0.22 * Math.sin(time * 1.4 + index * 2.7)) * scale,
        white: 0.55 - 0.45 * depth,
      });
    });

    const signalCount = size < 18 ? 1 : 2;
    for (let signal = 0; signal < signalCount; signal += 1) {
      const segment = Math.floor(time * 0.55 + signal * 7.31);
      const first = Math.floor(hashD(segment, signal * 3.1 + 1.7) * nodeCount);
      const second = Math.floor(hashD(segment, signal * 5.7 + 4.2) * nodeCount);
      if (first === second) continue;
      const amount = fraction(time * 0.55 + signal * 7.31);
      const x = lerp(nodes[first][0], nodes[second][0], amount);
      const y = lerp(nodes[first][1], nodes[second][1], amount);
      const z = lerp(nodes[first][2], nodes[second][2], amount);
      const length = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
      const [projectedX, projectedY, depth] = project(x / length, y / length, z / length);
      dots.push({
        x: projectedX,
        y: projectedY,
        z: depth,
        r: (2 + 1.4 * ((depth + 1) / 2)) * scale,
        white: 0.05,
        a: 0.85,
        accent,
      });
    }

    paintLines(context, lines, color);
    paintDots(context, dots, color, 0.52);
  }

  const renderers = {
    working: drawWorking,
    searching: drawSearching,
    connecting: drawConnecting,
  };

  class ThinkingOrbField {
    constructor({ canvas, host, entries, reducedMotion }) {
      this.canvas = canvas;
      this.host = host;
      this.context = canvas.getContext('2d', { alpha: true });
      this.reducedMotion = reducedMotion;
      this.entries = entries.map((entry, index) => ({
        ...entry,
        alpha: 0,
        currentX: null,
        currentY: null,
        targetX: 0,
        targetY: 0,
        targetAlpha: 0,
        phase: index * 0.83,
      }));
      this.pointer = { x: 0, y: 0 };
      this.targetPointer = { x: 0, y: 0 };
      this.width = 1;
      this.height = 1;
      this.pixelRatio = 1;
      this.frame = 0;
      this.inView = true;
      this.running = false;

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.visibilityObserver = new IntersectionObserver(entries => {
        this.inView = entries.some(entry => entry.isIntersecting);
        this.syncAnimation();
      });
      this.handleVisibility = () => this.syncAnimation();
      this.handleMotion = () => this.syncAnimation();

      this.resizeObserver.observe(host);
      this.visibilityObserver.observe(host);
      document.addEventListener('visibilitychange', this.handleVisibility);
      reducedMotion.addEventListener('change', this.handleMotion);
      this.resize();
      this.syncAnimation();
    }

    setTarget(name, x, y, visible = true) {
      const entry = this.entries.find(item => item.name === name);
      if (!entry) return;
      entry.targetX = x;
      entry.targetY = y;
      entry.targetAlpha = visible ? 1 : 0;
      if (entry.currentX === null) {
        entry.currentX = x;
        entry.currentY = y;
      }
      if (this.reducedMotion.matches) this.render(performance.now(), true);
    }

    setPointer(x, y) {
      this.targetPointer.x = x;
      this.targetPointer.y = y;
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.pixelRatio = Math.min(global.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.pixelRatio);
      this.canvas.height = Math.round(this.height * this.pixelRatio);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.render(performance.now(), true);
    }

    syncAnimation() {
      const shouldAnimate = this.inView && !document.hidden && !this.reducedMotion.matches;
      if (shouldAnimate && !this.running) {
        this.running = true;
        this.frame = requestAnimationFrame(time => this.render(time));
      } else if (!shouldAnimate && this.running) {
        this.running = false;
        cancelAnimationFrame(this.frame);
        this.render(performance.now(), true);
      } else if (this.reducedMotion.matches) {
        this.render(9400, true);
      }
    }

    render(timestamp, singleFrame = false) {
      const context = this.context;
      if (!context) return;
      const time = this.reducedMotion.matches ? 9.4 : timestamp / 1000;
      const interpolation = this.reducedMotion.matches ? 1 : 0.085;

      this.pointer.x = lerp(this.pointer.x, this.targetPointer.x, 0.04);
      this.pointer.y = lerp(this.pointer.y, this.targetPointer.y, 0.04);

      context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      context.clearRect(0, 0, this.width, this.height);

      this.entries.forEach((entry, index) => {
        entry.currentX = lerp(entry.currentX ?? entry.targetX, entry.targetX, interpolation);
        entry.currentY = lerp(entry.currentY ?? entry.targetY, entry.targetY, interpolation);
        entry.alpha = lerp(entry.alpha, entry.targetAlpha, this.reducedMotion.matches ? 1 : 0.12);
        if (entry.alpha < 0.01) return;

        const drift = this.reducedMotion.matches ? 0 : Math.sin(time * 0.65 + entry.phase) * (index === 0 ? 1.15 : 0.55);
        const parallax = this.reducedMotion.matches ? 0 : (index + 1) * 0.1;
        const x = entry.currentX + this.pointer.x * parallax + drift * 0.25;
        const y = entry.currentY - this.pointer.y * parallax + drift;

        context.save();
        context.globalAlpha = entry.alpha;
        context.translate(x - entry.size / 2, y - entry.size / 2);
        renderers[entry.state](context, entry.size, time + entry.phase, entry.color, entry.accent);
        context.restore();
      });

      if (this.running && !singleFrame) {
        this.frame = requestAnimationFrame(timeValue => this.render(timeValue));
      }
    }
  }

  global.ThinkingOrbs = Object.freeze({
    createField(options) {
      return new ThinkingOrbField(options);
    },
    hashD,
  });
})(window);
