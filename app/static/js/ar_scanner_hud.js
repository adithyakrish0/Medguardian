/**
 * AR Med-Scanner HUD - Three.js Overlay System
 * 
 * Professional 3D scanning effect for medication verification.
 * Uses Three.js for GPU-accelerated rendering of targeting reticle.
 * 
 * Features:
 * - Rotating targeting reticle (torus geometry)
 * - Scanning animation with pulse effects
 * - Success/failure state transitions
 * - Verification shield animation
 */

class ARMedScanner {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.reticle = null;
        this.innerRing = null;
        this.outerRing = null;
        this.scanLines = [];
        this.particles = [];
        this.shieldMesh = null;

        // State
        this.state = 'idle'; // idle, scanning, processing, success, error
        this.animationId = null;
        this.scanSpeed = 1;

        // Colors - professional medical aesthetic
        this.colors = {
            idle: 0x00d4ff,      // Cyan
            scanning: 0x00d4ff,  // Cyan
            processing: 0xffc107, // Amber
            success: 0x28a745,   // Green
            error: 0xdc3545      // Red
        };

        this.init();
    }

    init() {
        // Check for Three.js
        if (typeof THREE === 'undefined') {
            console.warn('Three.js not loaded, AR HUD disabled');
            return;
        }

        const width = this.container.clientWidth || 640;
        const height = this.container.clientHeight || 480;

        // Scene setup
        this.scene = new THREE.Scene();

        // Orthographic camera for 2D-style overlay
        const aspect = width / height;
        this.camera = new THREE.OrthographicCamera(
            -aspect, aspect, 1, -1, 0.1, 1000
        );
        this.camera.position.z = 5;

        // Renderer with transparency
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        // Style the canvas
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.zIndex = '10';
        this.renderer.domElement.id = 'ar-hud-canvas';

        this.container.style.position = 'relative';
        this.container.appendChild(this.renderer.domElement);

        // Create HUD elements
        this.createReticle();
        this.createScanLines();
        this.createCornerBrackets();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        // Start animation
        this.animate();

        console.log('✅ AR Med-Scanner HUD initialized');
    }

    createReticle() {
        // Outer ring - main targeting reticle
        const outerGeometry = new THREE.TorusGeometry(0.35, 0.008, 16, 64);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.idle,
            transparent: true,
            opacity: 0.9
        });
        this.outerRing = new THREE.Mesh(outerGeometry, outerMaterial);
        this.scene.add(this.outerRing);

        // Inner ring - secondary indicator
        const innerGeometry = new THREE.TorusGeometry(0.25, 0.005, 16, 64);
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.idle,
            transparent: true,
            opacity: 0.6
        });
        this.innerRing = new THREE.Mesh(innerGeometry, innerMaterial);
        this.scene.add(this.innerRing);

        // Center dot
        const dotGeometry = new THREE.CircleGeometry(0.02, 32);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.idle,
            transparent: true,
            opacity: 0.8
        });
        this.centerDot = new THREE.Mesh(dotGeometry, dotMaterial);
        this.scene.add(this.centerDot);

        // Targeting segments (4 segments like crosshairs)
        this.segments = [];
        for (let i = 0; i < 4; i++) {
            const segmentGeometry = new THREE.PlaneGeometry(0.15, 0.006);
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: this.colors.idle,
                transparent: true,
                opacity: 0.8
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            // Position at cardinal directions with gap
            const angle = (i * Math.PI / 2);
            const distance = 0.42;
            segment.position.x = Math.cos(angle) * distance;
            segment.position.y = Math.sin(angle) * distance;
            segment.rotation.z = angle;

            this.segments.push(segment);
            this.scene.add(segment);
        }
    }

    createScanLines() {
        // Horizontal scan lines that sweep through the frame
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.idle,
            transparent: true,
            opacity: 0.3
        });

        for (let i = 0; i < 3; i++) {
            const lineGeometry = new THREE.PlaneGeometry(2, 0.002);
            const line = new THREE.Mesh(lineGeometry, lineMaterial.clone());
            line.position.y = -1 + (i * 0.1);
            line.visible = false;
            this.scanLines.push(line);
            this.scene.add(line);
        }
    }

    createCornerBrackets() {
        // Corner brackets for scanning zone
        this.corners = [];
        const bracketMaterial = new THREE.LineBasicMaterial({
            color: this.colors.idle,
            transparent: true,
            opacity: 0.7
        });

        const positions = [
            { x: -0.6, y: 0.45, rotZ: 0 },           // Top-left
            { x: 0.6, y: 0.45, rotZ: Math.PI / 2 },  // Top-right
            { x: 0.6, y: -0.45, rotZ: Math.PI },     // Bottom-right
            { x: -0.6, y: -0.45, rotZ: -Math.PI / 2 } // Bottom-left
        ];

        positions.forEach(pos => {
            const points = [
                new THREE.Vector3(0, 0.1, 0),
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.1, 0, 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const bracket = new THREE.Line(geometry, bracketMaterial.clone());
            bracket.position.set(pos.x, pos.y, 0);
            bracket.rotation.z = pos.rotZ;
            this.corners.push(bracket);
            this.scene.add(bracket);
        });
    }

    createSuccessShield() {
        // Hexagonal shield that appears on success
        const shape = new THREE.Shape();
        const radius = 0.3;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI / 3) - Math.PI / 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: this.colors.success,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });

        this.shieldMesh = new THREE.Mesh(geometry, material);
        this.shieldMesh.scale.set(0.5, 0.5, 0.5);
        this.scene.add(this.shieldMesh);

        // Checkmark inside shield
        const checkPoints = [
            new THREE.Vector3(-0.08, 0, 0),
            new THREE.Vector3(-0.02, -0.06, 0),
            new THREE.Vector3(0.1, 0.08, 0)
        ];
        const checkGeometry = new THREE.BufferGeometry().setFromPoints(checkPoints);
        const checkMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            linewidth: 3
        });
        this.checkmark = new THREE.Line(checkGeometry, checkMaterial);
        this.scene.add(this.checkmark);
    }

    setState(newState) {
        if (this.state === newState) return;

        const prevState = this.state;
        this.state = newState;

        console.log(`AR Scanner: ${prevState} → ${newState}`);

        // Update colors and animations based on state
        const color = this.colors[newState] || this.colors.idle;
        this.updateColor(color);

        switch (newState) {
            case 'scanning':
                this.scanSpeed = 2;
                this.showScanLines(true);
                break;
            case 'processing':
                this.scanSpeed = 4;
                this.showScanLines(true);
                break;
            case 'success':
                this.scanSpeed = 0.5;
                this.showScanLines(false);
                this.playSuccessAnimation();
                break;
            case 'error':
                this.scanSpeed = 0.5;
                this.showScanLines(false);
                this.playErrorAnimation();
                break;
            default:
                this.scanSpeed = 1;
                this.showScanLines(false);
        }
    }

    updateColor(color) {
        if (this.outerRing) this.outerRing.material.color.setHex(color);
        if (this.innerRing) this.innerRing.material.color.setHex(color);
        if (this.centerDot) this.centerDot.material.color.setHex(color);

        this.segments?.forEach(seg => seg.material.color.setHex(color));
        this.corners?.forEach(corner => corner.material.color.setHex(color));
        this.scanLines?.forEach(line => line.material.color.setHex(color));
    }

    showScanLines(visible) {
        this.scanLines.forEach((line, i) => {
            line.visible = visible;
            line.position.y = -1 + (i * 0.1);
        });
    }

    playSuccessAnimation() {
        if (!this.shieldMesh) this.createSuccessShield();

        // Animate shield appearing
        const startTime = Date.now();
        const duration = 600;

        const animateShield = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            this.shieldMesh.material.opacity = eased * 0.4;
            this.shieldMesh.scale.setScalar(0.5 + eased * 0.5);
            this.shieldMesh.rotation.z = (1 - eased) * Math.PI * 0.5;

            if (this.checkmark) {
                this.checkmark.material.opacity = eased;
            }

            if (progress < 1) {
                requestAnimationFrame(animateShield);
            } else {
                // Hold for a moment then fade out
                setTimeout(() => this.fadeOutSuccess(), 1500);
            }
        };

        animateShield();
    }

    fadeOutSuccess() {
        const startTime = Date.now();
        const duration = 400;

        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (this.shieldMesh) {
                this.shieldMesh.material.opacity = 0.4 * (1 - progress);
            }
            if (this.checkmark) {
                this.checkmark.material.opacity = 1 - progress;
            }

            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                this.setState('idle');
            }
        };

        fade();
    }

    playErrorAnimation() {
        // Quick shake animation
        const startTime = Date.now();
        const duration = 400;
        const originalX = 0;

        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                const shake = Math.sin(progress * Math.PI * 6) * 0.02 * (1 - progress);
                this.outerRing.position.x = originalX + shake;
                this.innerRing.position.x = originalX + shake;
                requestAnimationFrame(shake);
            } else {
                this.outerRing.position.x = originalX;
                this.innerRing.position.x = originalX;
                setTimeout(() => this.setState('idle'), 1000);
            }
        };

        shake();
    }

    animate() {
        if (!this.renderer) return;

        const time = Date.now() * 0.001;

        // Rotate reticle elements
        if (this.outerRing) {
            this.outerRing.rotation.z = time * 0.3 * this.scanSpeed;
        }
        if (this.innerRing) {
            this.innerRing.rotation.z = -time * 0.5 * this.scanSpeed;
        }

        // Pulse effect
        const pulse = Math.sin(time * 2) * 0.1 + 1;
        if (this.outerRing) {
            this.outerRing.scale.setScalar(pulse);
        }

        // Animate scan lines (sweep from bottom to top)
        if (this.state === 'scanning' || this.state === 'processing') {
            this.scanLines.forEach((line, i) => {
                line.position.y = ((time * 0.5 + i * 0.3) % 2) - 1;
                line.material.opacity = 0.3 * (1 - Math.abs(line.position.y));
            });
        }

        // Segment pulse
        this.segments?.forEach((seg, i) => {
            const segPulse = Math.sin(time * 3 + i * Math.PI / 2) * 0.02;
            const baseDistance = 0.42;
            const angle = (i * Math.PI / 2);
            seg.position.x = Math.cos(angle) * (baseDistance + segPulse);
            seg.position.y = Math.sin(angle) * (baseDistance + segPulse);
        });

        // Render
        this.renderer.render(this.scene, this.camera);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    onResize() {
        if (!this.container || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;

        this.camera.left = -aspect;
        this.camera.right = aspect;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    startScan() {
        this.setState('scanning');
    }

    processing() {
        this.setState('processing');
    }

    success() {
        this.setState('success');
    }

    error() {
        this.setState('error');
    }

    reset() {
        this.setState('idle');
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer?.dispose();
    }
}

// Export for use
window.ARMedScanner = ARMedScanner;
