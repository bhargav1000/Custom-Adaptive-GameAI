import { Q, α, γ, ε, key, chooseAction, updateQ, saveQ } from './RL.js';

class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');
    }

    init() {
        // Reset all state variables for a clean restart
        this.isDeathSequenceActive = false;
        this.gameOverActive = false;
        this._xHookInitialized = false; // Use a more specific name for the debug flag
    }

    preload() {
        // Load all assets with the correct, visually confirmed 128x128 frame size.
        this.load.image('boss_arena', 'assets/map/boss_arena.png');
        this.load.spritesheet('idle', 'assets/character/Idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('walk', 'assets/character/Walk.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('run', 'assets/character/Run.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('melee', 'assets/character/Melee.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('rolling', 'assets/character/Rolling.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('take-damage', 'assets/character/TakeDamage.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('kick', 'assets/character/Kick.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('melee2', 'assets/character/Melee2.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('special1', 'assets/character/Special1.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('die', 'assets/character/Die.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('unsheath', 'assets/character/UnSheathSword.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shield-block-start', 'assets/character/ShieldBlockStart.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shield-block-mid', 'assets/character/ShieldBlockMid.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('front-flip', 'assets/character/FrontFlip.png', { frameWidth: 128, frameHeight: 128 });
        this.load.image('healthbar', 'assets/character/healthbar.png');
    }

    create() {
        // --- Map ---
        const map = this.add.image(0, 0, 'boss_arena').setOrigin(0);

        // --- Input & Properties ---
        this.keys = this.input.keyboard.createCursorKeys();
        this.keys.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keys.m = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keys.r = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.keys.k = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.keys.n = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
        this.keys.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keys.q = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keys.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keys.b = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.keys.f = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.keys.c = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.keys.p = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P); // Screenshot key

        // Keys for the debug panel, created only once.
        this.debugKeys = this.input.keyboard.addKeys('W,A,S,D,SPACE,Q,E,R,F,B,C,V');

        this.walkSpeed = 200;
        this.runSpeed = 350;
        this.rollSpeed = 400;
        this.frontFlipSpeed = 300;
        this.facing = 's'; // Default facing direction
        this.isDeathSequenceActive = false;
        this.shieldValue = 15;

        // --- Animations ---
        // This order MUST match the sprite sheet layout and the user's explicit direction mapping.
        // Ensure that this order is unchanged at all times: ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        this.directionMap = new Map(directions.map((d, i) => [d, i]));
        const framesPerRow = 15;
        directions.forEach((direction, index) => {
            const startFrame = index * framesPerRow;
            
            this.anims.create({
                key: `idle-${direction}`,
                frames: this.anims.generateFrameNumbers('idle', { start: startFrame, end: startFrame + 7 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: `walk-${direction}`,
                frames: this.anims.generateFrameNumbers('walk', { start: startFrame, end: startFrame + 14 }),
                frameRate: 15,
                repeat: -1
            });

            this.anims.create({
                key: `run-${direction}`,
                frames: this.anims.generateFrameNumbers('run', { start: startFrame, end: startFrame + 14 }),
                frameRate: 20,
                repeat: -1
            });

            this.anims.create({
                key: `melee-${direction}`,
                frames: this.anims.generateFrameNumbers('melee', { start: startFrame, end: startFrame + 14 }),
                frameRate: 40,
                repeat: 0
            });

            this.anims.create({
                key: `rolling-${direction}`,
                frames: this.anims.generateFrameNumbers('rolling', { start: startFrame, end: startFrame + 14 }),
                frameRate: 20,
                repeat: 0
            });

            this.anims.create({
                key: `take-damage-${direction}`,
                frames: this.anims.generateFrameNumbers('take-damage', { start: startFrame, end: startFrame + 7 }),
                frameRate: 20,
                repeat: 0
            });

            this.anims.create({
                key: `kick-${direction}`,
                frames: this.anims.generateFrameNumbers('kick', { start: startFrame, end: startFrame + 14 }),
                frameRate: 40,
                repeat: 0
            });

            this.anims.create({
                key: `melee2-${direction}`,
                frames: this.anims.generateFrameNumbers('melee2', { start: startFrame, end: startFrame + 14 }),
                frameRate: 24,
                repeat: 0
            });

            this.anims.create({
                key: `special1-${direction}`,
                frames: this.anims.generateFrameNumbers('special1', { start: startFrame, end: startFrame + 14 }),
                frameRate: 30,
                repeat: 0
            });

            this.anims.create({
                key: `shield-block-start-${direction}`,
                frames: this.anims.generateFrameNumbers('shield-block-start', { start: startFrame, end: startFrame + 3 }),
                frameRate: 30,
                repeat: 0
            });

            this.anims.create({
                key: `shield-block-mid-${direction}`,
                frames: this.anims.generateFrameNumbers('shield-block-mid', { start: startFrame, end: startFrame + 5 }),
                frameRate: 10,
                repeat: -1
            });

            this.anims.create({
                key: `front-flip-${direction}`,
                frames: this.anims.generateFrameNumbers('front-flip', { start: startFrame, end: startFrame + 14 }),
                frameRate: 45,
                repeat: 0
            });
        });

        // Add a single death animation, as it's not directional
        this.anims.create({
            key: 'die',
            frames: this.anims.generateFrameNumbers('die', { start: 0, end: 14 }),
            frameRate: 8,
            repeat: 0
        });

        directions.forEach((direction, index) => {
            const startFrame = index * framesPerRow;
            this.anims.create({
                key: `unsheath-${direction}`,
                frames: this.anims.generateFrameNumbers('unsheath', { start: startFrame, end: startFrame + 14 }),
                frameRate: 15,
                repeat: 0
            });
        });

        // --- Hero with Physics ---
        this.hero = this.matter.add.sprite(map.width/2, map.height/2, 'idle', 0);
        this.hero.setScale(1.5);
        this.hero.setCircle(42);
        this.hero.setFixedRotation();   // no spin
        this.hero.setIgnoreGravity(true).setFrictionAir(0);
        this.hero.body.slop = 0.5;   // tighter separation test
        this.hero.body.inertia = Infinity; // prevent any rotation
        this.hero.label = 'hero';
        // Hero collides with everything normally but can't be pushed by knight
        this.hero.body.collisionFilter.category = 0x0001;
        this.hero.body.collisionFilter.mask = 0x0006; // Collide with walls and knight
        // Make hero heavy to resist being pushed by knight
        this.hero.setMass(10000);
        this.hero.body.frictionStatic = 0.99;

        // Initialize attack state
        this.hero.isAttacking = false;
        this.hero.currentAttackType = null;
        this.hero.isBlocking = false;
        this.hero.isDead = false;
        
        // Initialize stamina system
        this.hero.maxStamina = 100;
        this.hero.stamina = this.hero.maxStamina;
        this.hero.staminaRegenRate = 1; // stamina per frame when not using
        this.hero.blockDisabled = false;
        this.hero.blockDisableTimer = 0;
        this.hero.staminaRegenDelay = 0;
        
        // Initialize armor attributes
        this.hero.armor = { 
            helmet: 0.10,      // 10% damage reduction for head hits
            breastplate: 0.30, // 30% damage reduction for torso hits  
            greaves: 0.15,     // 15% damage reduction for limb hits
            shieldFront: 0.50  // 50% damage reduction when blocking
        };
        
        // Initialize armor durability
        this.hero.armorDur = {
            helmet: 20,        // 20 durability points
            breastplate: 30,   // 30 durability points
            greaves: 15,       // 15 durability points
            shieldFront: 25    // 25 durability points
        };

        this.hero.on('animationcomplete', (animation) => {
            if (this.hero.isDead) { return; }
            if (animation.key.startsWith('shield-block-start-')) {
                if (this.keys.b.isDown) {
                    this.hero.anims.play(`shield-block-mid-${this.facing}`, true);
                } else {
                    this.hero.isBlocking = false;
                    this.hero.anims.play(`idle-${this.facing}`, true);
                }
                return;
            }

            if (animation.key.startsWith('melee-') || animation.key.startsWith('rolling-') || animation.key.startsWith('take-damage-') || animation.key.startsWith('kick-') || animation.key.startsWith('melee2-') || animation.key.startsWith('special1-') || animation.key.startsWith('front-flip-')) {
                // After an action, check if we should return to blocking or idle.
                if (this.keys.b.isDown && !this.hero.blockDisabled) {
                    this.hero.isBlocking = true;
                    this.hero.anims.play(`shield-block-mid-${this.facing}`, true);
                } else {
                    this.hero.isBlocking = false; // Ensure blocking is off if key isn't pressed
                    this.hero.anims.play(`idle-${this.facing}`, true);
                }
            }
        }, this);

        // --- Purple Knight ---
        this.purpleKnight = this.matter.add.sprite(map.width/2, map.height/4, 'idle', 0);
        this.purpleKnight.setScale(1.5);
        this.purpleKnight.setCircle(42);
        this.purpleKnight.setTint(0x9400D3);
        this.purpleKnight.setFixedRotation();
        this.purpleKnight.setIgnoreGravity(true);
        this.purpleKnight.body.slop = 0.5;   // tighter separation test
        this.purpleKnight.body.inertia = Infinity; // prevent any rotation
        this.purpleKnight.label = 'knight';
        // Knight is SOLID - collides with hero and walls
        this.purpleKnight.body.collisionFilter.category = 0x0002;
        this.purpleKnight.body.collisionFilter.mask = 0x0005; // Collide with hero and walls
        // Make knight EXTREMELY heavy and resistant to movement
        // Knight physics: Make completely immovable
        this.purpleKnight.setStatic(true); // Truly immovable static body

        this.purpleKnight.isBlocking = false;
        this.purpleKnight.shieldValue = 15;
        this.purpleKnight.facing = 's';
        this.purpleKnight.anims.play('idle-s', true); // Face down towards the player
        this.purpleKnight.maxHealth = 50;
        this.purpleKnight.health = this.purpleKnight.maxHealth;
        this.purpleKnight.attackCooldown = 0;
        this.purpleKnight.isAttacking = false;
        this.purpleKnight.currentAttackType = null;
        this.purpleKnight.isRecovering = false;
        this.purpleKnight.hitLanded = false;
        this.purpleKnight.actionCooldown = 0;
        this.purpleKnight.currentMovement = null;
        this.purpleKnight.movementDuration = 0;
        this.purpleKnight.isDead = false;
        this.purpleKnight.rewardAccumulator = 0;     // track per-frame reward
        this.lastRewardTick = 0;
        
        // Initialize stamina for knight
        this.purpleKnight.maxStamina = 100;
        this.purpleKnight.stamina = this.purpleKnight.maxStamina;
        this.purpleKnight.staminaRegenRate = 1;
        this.purpleKnight.blockDisabled = false;
        this.purpleKnight.blockDisableTimer = 0;
        this.purpleKnight.movementDisabled = false;
        this.purpleKnight.movementDisableTimer = 0;
        this.purpleKnight.movementAngle = 0;
        this.purpleKnight.movementDirection = 's';
        this.purpleKnight.staminaRegenDelay = 0;
        
        // Initialize armor attributes
        this.purpleKnight.armor = { 
            helmet: 0.15,      // 15% damage reduction for head hits (heavier armor)
            breastplate: 0.40, // 40% damage reduction for torso hits (heavier armor)
            greaves: 0.20,     // 20% damage reduction for limb hits (heavier armor)
            shieldFront: 0.60  // 60% damage reduction when blocking (better shield)
        };
        
        // Initialize armor durability (heavier armor has more durability)
        this.purpleKnight.armorDur = {
            helmet: 30,        // 30 durability points
            breastplate: 40,   // 40 durability points
            greaves: 25,       // 25 durability points
            shieldFront: 35    // 35 durability points
        };

        this.purpleKnight.on('animationcomplete', (animation) => {
            if (this.purpleKnight.isDead) { return; }
            if (animation.key.startsWith('take-damage-')) {
                const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.purpleKnight.x, this.purpleKnight.y, this.hero.x, this.hero.y));
                this.purpleKnight.anims.play(`idle-${direction}`, true);
            } else if (animation.key.startsWith('shield-block-start-')) {
                if (this.purpleKnight.isBlocking) {
                    const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.purpleKnight.x, this.purpleKnight.y, this.hero.x, this.hero.y));
                    this.purpleKnight.anims.play(`shield-block-mid-${direction}`, true);
                } else {
                    const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.purpleKnight.x, this.purpleKnight.y, this.hero.x, this.hero.y));
                    this.purpleKnight.anims.play(`idle-${direction}`, true);
                }
            }
        }, this);

        // --- Collisions ---
        const WALL = 40;                          // 40 px thickness
        const walls = [
            this.matter.add.rectangle(135+1268/2, 165-WALL/2, 1268, WALL, { 
                isStatic:true,
                collisionFilter: { category: 0x0004, mask: 0x0003 } // Walls collide with both hero and knight
            }),  // top
            this.matter.add.rectangle(105+1265/2, 818+WALL/2, 1265, WALL, { 
                isStatic:true,
                collisionFilter: { category: 0x0004, mask: 0x0003 } 
            }),  // bottom
            this.matter.add.rectangle(135-WALL/2, 165+728/2, WALL, 728, { 
                isStatic:true,
                collisionFilter: { category: 0x0004, mask: 0x0003 } 
            }),    // left
            this.matter.add.rectangle(1368+WALL/2, 165+728/2, WALL, 728, { 
                isStatic:true,
                collisionFilter: { category: 0x0004, mask: 0x0003 } 
            })   // right
        ];
        this.obstacles = walls;

        // Set up collision detection for attacks
        


        // F2 debug
        if (!this._f2) {
            this._f2 = true;
            this.input.keyboard.on('keydown-F2', () => {
                this.obstacles.forEach(o => {
                    if (!o.debugG) {
                        const bounds = o.bounds;
                        o.debugG = this.add.graphics().lineStyle(1, 0xff0000)
                            .strokeRect(bounds.min.x, bounds.min.y, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);
                    } else { 
                        o.debugG.destroy(); 
                        o.debugG = null; 
                    }
                });
            });
        }

        // --- Debug Red Boundaries (X) ---
        const redBoundaries = this.add.graphics().setDepth(100).setVisible(false);
        redBoundaries.lineStyle(2, 0xff0000, 0.8);
        const boundaryRects = [
            { x: 135, y: 165, w: 1268, h: 5 },  // top
            { x: 105, y: 818, w: 1265, h: 5 },  // bottom  
            { x: 135, y: 165, w: 5, h: 728 },   // left
            { x: 1368, y: 165, w: 5, h: 728 }   // right
        ];
        boundaryRects.forEach(r => {
            redBoundaries.strokeRect(r.x, r.y, r.w, r.h);
        });
        // Draw knight collision circle
        redBoundaries.strokeCircle(this.purpleKnight.x, this.purpleKnight.y, 42);
        // Draw hero collision circle  
        redBoundaries.strokeCircle(this.hero.x, this.hero.y, 42);


        if (!this._xHookInitialized) {
            this._xHookInitialized = true;
            this.blueBoundaries = this.add.graphics().setDepth(100).setVisible(false);
            this.greenBoundaries = this.add.graphics().setDepth(100).setVisible(false);
            this.input.keyboard.on('keydown-X', () => {
            this.debugGraphicsVisible = !this.debugGraphicsVisible;
            redBoundaries.setVisible(this.debugGraphicsVisible);
            this.blueBoundaries.setVisible(this.debugGraphicsVisible);
            this.greenBoundaries.setVisible(this.debugGraphicsVisible);
            });
            this.redBoundaries = redBoundaries; // Store for update loop
            this.boundaryRects = boundaryRects; // Store for update loop

            // --- Purple Knight Health Bar ---
            const barX = this.game.config.width / 2 - 100;
            const barY = this.game.config.height - 60; // Position adjusted for stamina bar
            const barWidth = 200;
            
            this.knightHealthBarBg = this.add.graphics().setScrollFactor(0).setDepth(101); // For glow
            this.knightHealthBar = this.add.graphics().setScrollFactor(0).setDepth(102);
            this.knightNameText = this.add.text(barX + barWidth/2, barY - 15, 'Purple Knight', {
                fontSize: '12px',
                fill: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(103);
            this.updateKnightHealthBar();

            // --- Knight Stamina Bar ---
            this.knightStaminaBarBg = this.add.graphics().setScrollFactor(0).setDepth(101); // For glow
            this.knightStaminaBar = this.add.graphics().setScrollFactor(0).setDepth(102);
            this.updateKnightStaminaBar(); // Initial draw

            // --- Game Over UI ---
            this.gameOverText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 40, '', {
                fontSize: '48px',
                fill: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

            this.restartText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 + 20, 'Press Q to Restart', {
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
            this.gameOverActive = false;


            // --- Health Bar ---
            this.hero.maxHealth = 100;
            this.hero.health = this.hero.maxHealth;
            this.healthBarBg = this.add.graphics().setScrollFactor(0).setDepth(101);
            this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(102);
            this.updateHealthBar(); // Initial draw
            
            // Add health bar label
            this.heroNameText = this.add.text(120, 10, 'Hero Health', {
                fontSize: '12px',
                fill: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(103);
            
            // Stamina bar
            this.staminaBarBg = this.add.graphics().setScrollFactor(0).setDepth(101);
            this.staminaBar = this.add.graphics().setScrollFactor(0).setDepth(102);
            this.updateStaminaBar(); // Initial draw
        }

        // --- Event Logging & WebSocket Bridge ---
        this.socket = new WebSocket('ws://localhost:8765');
        this.eventBuf = [];
        this.aiLog = [];
        this.hitCount = 0;
        this.totalActions = 0;
        
        this.logEvt = (actor, action) => {
            // Hero's facing direction is on the scene, knight's is on the object itself
            const directionStr = (actor === this.hero) ? this.facing : actor.facing;

            const event = {
                t: this.time.now,
                actor: actor.name,
                pos: [actor.x, actor.y],
                dir: this.directionMap.get(directionStr),
                hp: actor.health / actor.maxHealth,
                action
            };
            
            this.eventBuf.push(event);
            
            // Display event in bottom panel
            this.displayEvent(event);
            
            if (this.eventBuf.length > 60) {
                this.eventBuf.shift();
            }
        };

        // Flush event buffer every 150ms
        this.time.addEvent({
            delay: 150,
            loop: true,
            callback: () => {
                if (this.socket.readyState === WebSocket.OPEN && this.eventBuf.length) {
                    this.socket.send(JSON.stringify(this.eventBuf));
                    this.eventBuf.length = 0;
                }
            }
        });

        // --- Camera ---
        this.cameras.main.startFollow(this.hero);
        this.cameras.main.setBounds(0, 0, map.width, map.height);
        this.cameras.main.roundPixels = true;


        
        // --- Xbox Controller Setup (Native Browser API) ---
        this.gamepad = null;
        this.lastGamepadState = {};



        this.lastScreenshotTime = 0;
        this.screenshotInterval = 100; // ms
    }

    knightReact() {
        const knight = this.purpleKnight;
        if (knight.isDead || knight.isTakingDamage || knight.isBlocking || knight.blockDisabled) return;
    
        const distance = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, knight.x, knight.y);
    
        if (distance < 150) { 
            if (Math.random() < 0.75) { 
                knight.isBlocking = true;
                
                const angle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
                const direction = this.getDirectionFromAngle(angle);
                knight.anims.play(`shield-block-start-${direction}`, true);
    
                this.time.delayedCall(600, () => {
                    knight.isBlocking = false;
                    
                    const knightAnim = knight.anims.currentAnim;
                    if(knightAnim && knightAnim.key.startsWith('shield-block-mid-')) {
                        const newAngle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
                        const newDirection = this.getDirectionFromAngle(newAngle);
                        knight.anims.play(`idle-${newDirection}`, true);
                    }
                });
            }
        }
    }



    showGameOverScreen(didWin) {
        this.gameOverActive = true;
        this.isDeathSequenceActive = false; // Allow Q to be pressed
        this.gameOverText.setText(didWin ? 'YOU WIN' : 'YOU DIED').setVisible(true);
        this.restartText.setVisible(true);
    }

    updateKnightHealthBar() {
        if (!this.knightHealthBar) return;
        
        const x = this.game.config.width / 2 - 100;
        const y = this.game.config.height - 60;
        const w = 200;
        const h = 25;
        const color = 0x9400D3; // Main purple
        const highlightColor = 0xC8A2C8; // Light lilac for the top highlight

        this.knightHealthBar.clear();

        const healthPercentage = Math.max(0, this.purpleKnight.health / this.purpleKnight.maxHealth);
        const healthWidth = healthPercentage * w;

        if (healthWidth > 0) {
            // Main Bar
            this.knightHealthBar.fillStyle(color);
            this.knightHealthBar.fillRect(x, y, healthWidth, h);
            // Top Highlight
            this.knightHealthBar.fillStyle(highlightColor);
            this.knightHealthBar.fillRect(x, y, healthWidth, h * 0.25); // Highlight is 25% of the height
        }
    }

    updateHealthBar() {
        if (!this.healthBar) return;
        
        const x = 20;
        const y = 20;
        const w = 200;
        const h = 25;
        const color = 0x00cc00; // A slightly darker green
        const highlightColor = 0x90EE90; // Light green

        this.healthBar.clear();

        const healthPercentage = (this.hero.health / this.hero.maxHealth);
        const healthWidth = Math.max(0, healthPercentage * w);

        if (healthWidth > 0) {
            // Main Bar
            this.healthBar.fillStyle(color);
            this.healthBar.fillRect(x, y, healthWidth, h);
            // Top Highlight
            this.healthBar.fillStyle(highlightColor);
            this.healthBar.fillRect(x, y, healthWidth, h * 0.25);
        }
    }

    updateStaminaBar() {
        const x = 20;
        const y = 50;
        const w = 200;
        const h = 10;
        const color = 0x0088ff; // Solid blue

        this.staminaBar.clear();

        const staminaPercentage = (this.hero.stamina / this.hero.maxStamina);
        const staminaWidth = Math.max(0, staminaPercentage * w);

        if (staminaWidth > 0) {
            this.staminaBar.fillStyle(color);
            this.staminaBar.fillRect(x, y, staminaWidth, h);
        }
    }

    updateKnightStaminaBar() {
        if (!this.knightStaminaBar) return;

        const x = this.game.config.width / 2 - 100;
        const y = this.game.config.height - 30;
        const w = 200;
        const h = 10;
        const color = 0x0088ff; // Solid blue

        this.knightStaminaBar.clear();

        const staminaPercentage = (this.purpleKnight.stamina / this.purpleKnight.maxStamina);
        const staminaWidth = Math.max(0, staminaPercentage * w);

        if (staminaWidth > 0) {
            this.knightStaminaBar.fillStyle(color);
            this.knightStaminaBar.fillRect(x, y, staminaWidth, h);
        }
    }

    animateHealthBarDamage(target, oldHealth) {
        // Fallback: immediately update health bar if animation system fails
        if (!this.tweens) {
    
            this.updateHealthBar();
            return;
        }
        
        // Create a temporary "damage flash" effect
        const x = 20;
        const y = 20;
        const w = 200;
        const h = 30;
        
        // Flash the health bar white briefly
        if (this.healthFlash) this.healthFlash.destroy();
        this.healthFlash = this.add.graphics().setScrollFactor(0).setDepth(103);
        this.healthFlash.fillStyle(0xffffff, 0.7);
        this.healthFlash.fillRect(x, y, w, h);
        
        // Animate the health bar dropping from old to new value
        const startHealthWidth = (oldHealth / this.hero.maxHealth) * w;
        const endHealthWidth = (target.health / this.hero.maxHealth) * w;
        
        
        this.tweens.add({
            targets: { width: startHealthWidth },
            width: endHealthWidth,
            duration: 300,
            ease: 'Power2',
            onUpdate: (tween) => {
                const currentWidth = tween.targets[0].width;
                this.healthBar.clear();
                this.healthBar.fillStyle(0x00ff00);
                this.healthBar.fillRect(x, y, Math.max(0, currentWidth), h);
            },
            onComplete: () => {
                this.updateHealthBar(); // Ensure final state is correct
            }
        });
        
        // Remove the flash effect
        this.time.delayedCall(100, () => {
            if (this.healthFlash) {
                this.healthFlash.destroy();
                this.healthFlash = null;
            }
        });
        
        // Fallback: update directly after a delay if animation fails
        this.time.delayedCall(400, () => {
            this.updateHealthBar();
        });
    }

    animateKnightHealthBarDamage(target, oldHealth) {
        // Fallback: immediately update health bar if animation system fails
        if (!this.tweens) {
    
            this.updateKnightHealthBar();
            return;
        }
        
        // Create a temporary "damage flash" effect
        const x = this.game.config.width / 2 - 100;
        const y = this.game.config.height - 50;
        const w = 200;
        const h = 20;
        
        // Flash the knight health bar white briefly
        if (this.knightHealthFlash) this.knightHealthFlash.destroy();
        this.knightHealthFlash = this.add.graphics().setScrollFactor(0).setDepth(103);
        this.knightHealthFlash.fillStyle(0xffffff, 0.7);
        this.knightHealthFlash.fillRect(x, y, w, h);
        
        // Animate the health bar dropping from old to new value
        const startHealthWidth = (oldHealth / this.purpleKnight.maxHealth) * w;
        const endHealthWidth = (target.health / this.purpleKnight.maxHealth) * w;
        

        
        // Tween the health bar width
        this.tweens.add({
            targets: { width: startHealthWidth },
            width: endHealthWidth,
            duration: 300,
            ease: 'Power2',
            onUpdate: (tween) => {
                const currentWidth = tween.targets[0].width;
                this.knightHealthBar.clear();
                this.knightHealthBar.fillStyle(0x9400D3);
                this.knightHealthBar.fillRect(x, y, Math.max(0, currentWidth), h);
            },
            onComplete: () => {

 // Ensure final state is correct
            }
        });
        
        // Remove the flash effect
        this.time.delayedCall(100, () => {
            if (this.knightHealthFlash) {
                this.knightHealthFlash.destroy();
                this.knightHealthFlash = null;
            }
        });
        
        // Fallback: update directly after a delay if animation fails
        this.time.delayedCall(400, () => {
            this.updateKnightHealthBar();
        });
    }

    getAngleFromDirection(direction) {
        const angles = {
            'e': 0, 'se': 45, 's': 90, 'sw': 135,
            'w': 180, 'nw': -135, 'n': -90, 'ne': -45
        };
        return Phaser.Math.DegToRad(angles[direction]);
    }

    getDirectionFromAngle(angle) {
        const degrees = Phaser.Math.RadToDeg(angle);
        let direction = 's';
        if (degrees >= -22.5 && degrees < 22.5) direction = 'e';
        else if (degrees >= 22.5 && degrees < 67.5) direction = 'se';
        else if (degrees >= 67.5 && degrees < 112.5) direction = 's';
        else if (degrees >= 112.5 && degrees < 157.5) direction = 'sw';
        else if (degrees >= 157.5 || degrees < -157.5) direction = 'w';
        else if (degrees >= -157.5 && degrees < -112.5) direction = 'nw';
        else if (degrees >= -112.5 && degrees < -67.5) direction = 'n';
        else if (degrees >= -67.5 && degrees < -22.5) direction = 'ne';
        return direction;
    }

    performAttack = (attacker, attackType) => {
        // Prevent attacks during recovery or existing attack
        if (attacker.isAttacking || attacker.isRecovering) {
            return;
        }
        
        // Check stamina cost
        let staminaCost = 10; // Default
        if (attackType === 'melee') staminaCost = 15;
        else if (attackType === 'melee2') staminaCost = 25;
        else if (attackType === 'special1') staminaCost = 40;
        else if (attackType === 'kick') staminaCost = 20;
        
        // Check if enough stamina
        if (attacker.stamina < staminaCost) {
            return;
        }
        
        // Consume stamina
        attacker.stamina -= staminaCost;
        
        // Set stamina regen delay based on attack
        if (attackType === 'special1') {
            attacker.staminaRegenDelay = 1500; // 1.5s delay
        } else if (attackType === 'melee2') {
            attacker.staminaRegenDelay = 1000; // 1s delay
        } else {
            attacker.staminaRegenDelay = 500; // 0.5s delay for light attacks
        }
        
        attacker.isAttacking = true;
        attacker.currentAttackType = attackType;
        
        // Get direction for the attacker
        const direction = attacker === this.hero ? this.facing : attacker.facing;
        
        // Play attack animation and immediately pause on frame 0 for wind-up
        attacker.anims.play(`${attackType}-${direction}`, true);
        attacker.anims.pause(); // Freeze on first frame
        
        // Log the attack event
        this.logEvt(attacker, `attack_${attackType}`);
        
        // Delay before blade glow flash (50ms before impact)
        this.time.delayedCall(50, () => this.triggerBladeGlow(attacker), [], this);
        
        // Delay before continuing animation and spawning hit sensor (100ms wind-up)
        this.time.delayedCall(100, () => this.continueAttack(attacker), [], this);
    };

    triggerBladeGlow = (attacker) => {
        if (!attacker.isAttacking) return; // Attack was cancelled
        
        // Apply bright yellow/white tint for blade glow effect
        attacker.setTint(0xFFFF99); // Bright yellow-white color
        
        // Remove tint after 50ms
        this.time.delayedCall(50, () => {
            if (attacker.active) {
                // Restore original tint
                if (attacker === this.purpleKnight) {
                    attacker.setTint(0x9400D3); // Purple knight's original color
                } else {
                    attacker.clearTint(); // Hero's original color
                }
            }
        });
    };

    continueAttack = (attacker) => {
        if (!attacker.isAttacking) return; // Attack was cancelled
        
        // Resume the paused animation to continue from frame 1
        attacker.anims.resume();
        
        // Spawn sword sensor exactly when the blade should be “live”
        const target = attacker === this.hero ? this.purpleKnight : this.hero;
        this.spawnSwordSensor(attacker, target, attacker.currentAttackType);

        
        // Emit sword arc particles at the moment of sensor spawn
        this.createSwordArcParticles(attacker);
        
        // Nudge camera opposite to swing direction for impact effect
        this.nudgeCamera(attacker);
        

        
        // Reset attack state when animation completes
        attacker.once('animationcomplete', (animation) => {
            if (attacker.isDead) { return; }
            // Only handle attack animations
            if (animation.key.includes(attacker.currentAttackType)) {
                attacker.isAttacking = false;
                attacker.currentAttackType = null;
                attacker.attackCooldown = 0;
                
                // Return to idle if not recovering
                if (!attacker.isRecovering) {
                    const direction = attacker === this.hero ? this.facing : attacker.facing;
                    attacker.anims.play(`idle-${direction}`, true);
                }
            }
        });
    };

    createSwordArcParticles = (attacker) => {
        const direction = attacker === this.hero ? this.facing : attacker.facing;
        const angle = this.getAngleFromDirection(direction);
        
        // Create 3-5 spark particles along the blade arc
        const numParticles = Phaser.Math.Between(3, 5);
        
        for (let i = 0; i < numParticles; i++) {
            // Position particles along an arc in front of the attacker
            const arcProgress = i / (numParticles - 1); // 0 to 1
            const arcRadius = 20 + (arcProgress * 15); // 20 to 35 pixels from attacker
            const arcAngle = angle + (arcProgress - 0.5) * 0.8; // Small arc spread
            
            const particleX = attacker.x + Math.cos(arcAngle) * arcRadius;
            const particleY = attacker.y + Math.sin(arcAngle) * arcRadius;
            
            // Create spark particle using graphics
            const spark = this.add.graphics();
            spark.fillStyle(0xFFFFAA); // Bright yellow spark
            spark.fillCircle(0, 0, 2); // Small 2px radius spark
            spark.setPosition(particleX, particleY);
            spark.setDepth(50); // Above characters but below UI
            
            // Add particle movement and fade out
            const velocityX = Math.cos(arcAngle) * 30 + (Math.random() - 0.5) * 20;
            const velocityY = Math.sin(arcAngle) * 30 + (Math.random() - 0.5) * 20;
            
            // Animate particle
            this.tweens.add({
                targets: spark,
                x: particleX + velocityX,
                y: particleY + velocityY,
                alpha: 0,
                scaleX: 0.3,
                scaleY: 0.3,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    spark.destroy();
                }
            });
        }
    };

    spawnSwordSensor(attacker, target, attackType) {
        // 1. Get the angle from the attacker’s current facing direction.
        const direction = attacker === this.hero ? this.facing : attacker.facing;
        const angle = this.getAngleFromDirection(direction);

        // 2. The sensor is pushed out by a fixed distance (the sword's reach).
        const reach = 60; // A fixed distance of 60 pixels.

        const offset = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle))
                       .scale(reach);

        // ------------------------------------------------------------------
        // 3) Big enough rectangle so slight aim errors still count
        // ------------------------------------------------------------------
        const sensorBody = this.matter.add.rectangle(
            attacker.x + offset.x,
            attacker.y + offset.y,
            40, 40,                               // larger “blade” area
            { isSensor: true, label: 'sword' }
        );

        // Use the attacker's own collision category for the sensor. This makes the sensor
        // act as a proxy for the attacker, ensuring it collides with the target correctly.
        sensorBody.collisionFilter = {
            category: attacker.body.collisionFilter.category,
            mask: 0xFFFF // Check against all other categories
        };

        // (Optional) visualise for one frame while you test
        let sensorViz = null;
        if (this.debugGraphicsVisible) {
            sensorViz = this.add.graphics().lineStyle(1, 0xffff00)
                .strokeRect(sensorBody.position.x - 20, sensorBody.position.y - 20, 40, 40);
        }

        // ------------------------------------------------------------------
        // Single-use collision handler
        // ------------------------------------------------------------------
        const onHit = (event) => {
            for (const { bodyA, bodyB } of event.pairs) {
                const hit = (bodyA === sensorBody && bodyB === target.body) ||
                            (bodyB === sensorBody && bodyA === target.body);

                if (hit) {
                    this.handleAttackImpact(attacker, target, attackType);
                    this.matter.world.off('collisionstart', onHit);
                    this.matter.world.remove(sensorBody);
                    if (sensorViz) sensorViz.destroy();
                    return;
                }
            }
        };
        this.matter.world.on('collisionstart', onHit);

        // Safety cleanup after 200 ms (≈ attack animation length)
        this.time.delayedCall(200, () => {
            this.matter.world.off('collisionstart', onHit);
            this.matter.world.remove(sensorBody);
            if (sensorViz) sensorViz.destroy();
        });
    }

    handleAttackImpact(attacker, target, attackType) {
        if (!target || target.isDead || target.isTakingDamage) {
            return;
        }

        // --- NEW DIRECTIONAL BLOCKING LOGIC ---
        if (target.isBlocking && !target.blockDisabled) {
            // Angle from the defender (target) to the attacker. This is the direction of the incoming threat.
            const angleToAttacker = Phaser.Math.Angle.Between(target.x, target.y, attacker.x, attacker.y);

            // The direction the defender is currently facing, which is stored differently for hero and knight.
            const targetFacingDirection = (target === this.hero) ? this.facing : target.facing;
            const targetFacingAngle = this.getAngleFromDirection(targetFacingDirection);

            // Calculate the shortest angle difference. This correctly handles wrap-around (e.g., -170 vs 170 degrees).
            const angleDifference = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(targetFacingAngle), Phaser.Math.RadToDeg(angleToAttacker));

            // Successful block if the defender is facing the attacker within a 90-degree arc (±45 degrees).
            if (Math.abs(angleDifference) <= 45) {
                // 1. Consume stamina for the block.
                const staminaCost = 15; // Stamina cost for a successful block.
                target.stamina = Math.max(0, target.stamina - staminaCost);

                // 2. Stop all further processing. No damage, no knockback.
                return;
            }
            // If the block is not successful (wrong direction), the attack proceeds below.
        }
        // --- END NEW BLOCKING LOGIC ---

        // Base damage values
        let baseDamage = 10;
        if (attackType === 'melee2') baseDamage = 15;
        if (attackType === 'special1') baseDamage = 25;
        if (attackType === 'kick') baseDamage = 5;

        const wasKnight = (attacker === this.purpleKnight && target === this.hero);

        // Calculate all modifiers (blocking is now handled above)
        const armorMod = this.getArmorModifier(target, attacker.x, attacker.y, baseDamage);
        const critMod = this.getCritModifier(attacker, target);
        let finalDamage = baseDamage * armorMod * critMod;

        // Apply the final calculated damage
        this.applyDamage(target, finalDamage);

        if (wasKnight && finalDamage > 0) {          // knight hit hero
            const next   = this.getKnightState(this.purpleKnight);
            updateQ(this.purpleKnight.lastState,
                    this.purpleKnight.lastAction,
                    20,                              // positive reward
                    next);
        }

        // Play hit reaction and apply knockback
        if (finalDamage > 0 && !target.isDead) {
            this.playHitReaction(target);
            this.applyKnockback(target, attacker, 0.5);
        }
    }

    nudgeCamera = (attacker) => {
        const direction = attacker === this.hero ? this.facing : attacker.facing;
        const angle = this.getAngleFromDirection(direction);
        
        // Calculate nudge direction (opposite to swing direction)
        const nudgeAngle = angle + Math.PI; // 180 degrees opposite
        const nudgeStrength = Phaser.Math.Between(2, 3); // 2-3 pixel nudge
        
        // Calculate nudge offset
        const nudgeX = Math.cos(nudgeAngle) * nudgeStrength;
        const nudgeY = Math.sin(nudgeAngle) * nudgeStrength;
        
        // Store original camera position
        const originalX = this.cameras.main.scrollX;
        const originalY = this.cameras.main.scrollY;
        
        // Apply camera nudge
        this.cameras.main.setScroll(originalX + nudgeX, originalY + nudgeY);
        
        // Return camera to original position after one frame (~16ms)
        this.time.delayedCall(16, () => {
            this.cameras.main.setScroll(originalX, originalY);
        });
    };





    

    handleDeath(character) {
        character.isDead = true;
        character.setVelocity(0, 0);

        if (character === this.purpleKnight) {
            this.hero.anims.play(`unsheath-${this.facing}`, true);
            this.purpleKnight.anims.play('die', true);
            this.showGameOverScreen(true); // Player wins
        } else {
            this.purpleKnight.anims.play(`unsheath-${this.purpleKnight.facing}`, true);
            this.hero.anims.play('die', true);
            this.showGameOverScreen(false); // Player loses
        }
        setTimeout(saveQ, 0);         // save once the episode ends
    }



    getArmorModifier = (target, hitX, hitY, damage) => {
        // Determine armor slot based on blocking status and hit zone
        let armorSlot = 'breastplate'; // default to torso
        
        if (hitX !== undefined && hitY !== undefined) {
            // Calculate hit zone based on distance from target center
            const targetRadius = target.body.circleRadius;
            const d = Phaser.Math.Distance.Between(hitX, hitY, target.x, target.y);
            
            if (d < targetRadius * 0.3) {
                // Head zone
                armorSlot = 'helmet';
            } else if (d < targetRadius * 0.7) {
                // Torso zone  
                armorSlot = 'breastplate';
            } else {
                // Limbs zone
                armorSlot = 'greaves';
            }
        }
        
        // Apply armor durability damage
        if (target.armorDur && target.armorDur[armorSlot] > 0) {
            target.armorDur[armorSlot] -= damage;
            if (target.armorDur[armorSlot] <= 0) {
                target.armor[armorSlot] /= 2;  // Halve protection when broken
                target.armorDur[armorSlot] = 0; // Mark as broken
            }
        }
        
        // Apply armor damage reduction: dmg *= (1 - armor[slot])
        const armorReduction = target.armor[armorSlot] || 0;
        return (1 - armorReduction);
    };

    getCritModifier = (attacker, target) => {
        // Basic crit system - can be expanded later
        const critChance = 0.1; // 10% crit chance
        if (Math.random() < critChance) {
            return 1.5; // 50% more damage on crit
        }
        return 1.0; // No crit
    };

    applyDamage = (target, damage) => {
        if (!target || target.isDead) return;




        
        // Store old health for animation
        const oldHealth = target.health;
        target.health -= damage;
        
        // Ensure health doesn't go below 0
        target.health = Math.max(0, target.health);

        if (target === this.purpleKnight && damage > 0) {
            const next = this.getKnightState(this.purpleKnight);
            updateQ(this.purpleKnight.lastState,
                    this.purpleKnight.lastAction,
                    -20,                            // negative reward
                    next);
        }
        
        // Log damage event
        this.logEvt(target, `took_damage_${damage.toFixed(1)}`);
        
        // Add visual feedback for damage taken - FORCE update health bars
        if (target === this.hero) {

            this.animateHealthBarDamage(target, oldHealth);
            this.updateHealthBar();
        } else if (target === this.purpleKnight) {

            this.animateKnightHealthBarDamage(target, oldHealth);
            this.updateKnightHealthBar();
        }

        // Death check
        if (target.health <= 0 && !target.isDead) {
            if (target === this.purpleKnight) {      // knight DIED  (-100)
                const next = {distBin:'dead',playerDir:'x'};
                updateQ(this.purpleKnight.lastState,
                        this.purpleKnight.lastAction,
                        -100,
                        next);
            }
            this.handleDeath(target);
        } else if (!target.isDead) {
            target.isTakingDamage = true;
            this.time.delayedCall(500, () => { 
                if (target && target.active) {
                    target.isTakingDamage = false; 
                }
            });
        }
    };

    applyKnockback = (target, attacker, attackType) => {
        // Special knockback for special attack on knight
        if (attackType === 'special1' && target === this.purpleKnight) {
            const knockbackAngle = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
            const knockbackVelocity = new Phaser.Math.Vector2(Math.cos(knockbackAngle), Math.sin(knockbackAngle)).scale(5); // Increased force for visibility
            
            target.setStatic(false);
            target.setVelocity(knockbackVelocity.x, knockbackVelocity.y);
            
            this.time.delayedCall(150, () => {
                if (target.active && !target.isDead) {
                    target.setVelocity(0, 0);
                    target.setStatic(true);
                }
            });
            return;
        }

        // Original knockback logic for the hero
        if (target === this.hero) {
            const knockbackDistance = 15;
            const knockbackAngle = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
            const knockbackVelocity = new Phaser.Math.Vector2(Math.cos(knockbackAngle), Math.sin(knockbackAngle)).scale(knockbackDistance * 0.5);
            target.setVelocity(knockbackVelocity.x, knockbackVelocity.y);
            this.time.delayedCall(50, () => {
                if (target.active && !target.isDead) {
                    target.setVelocity(0, 0);
                }
            });
        }
    };

    playHitReaction = (target) => {

        if (!target.active) return; // Prevent errors if target is destroyed

        // If the target was attacking, cancel it to prevent a stun lock.
        if (target.isAttacking) {
            target.isAttacking = false;
            target.currentAttackType = null;
        }

        // Visual feedback
        target.setTint(0xff0000);
        
        // Play damage animation
        const attacker = target === this.hero ? this.purpleKnight : this.hero;
        let angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);

        // To play the animation for the direction OPPOSITE to the hit, we add PI (180 degrees)
        // to the impact angle. This makes the character appear to recoil from the blow.
        angle = Phaser.Math.Angle.Wrap(angle + Math.PI);

        const direction = this.getDirectionFromAngle(angle);
        target.anims.play(`take-damage-${direction}`, true);
        
        // Reset tint after duration
        this.time.delayedCall(200, () => {
            if (target.active) { // Check if target is still active
                if (target === this.purpleKnight) {
                    target.setTint(0x9400D3);
                } else {
                    target.clearTint();
                }
            }
        });
    };

    getKnightState(knight) {
        // Calculate distance to player and bin it
        const distanceToPlayer = Phaser.Math.Distance.Between(knight.x, knight.y, this.hero.x, this.hero.y);
        let distBin;
        if (distanceToPlayer < 60) distBin = 'close';
        else if (distanceToPlayer < 120) distBin = 'medium';
        else distBin = 'far';
        
        // Get player direction relative to knight
        const angle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
        const playerDir = this.getDirectionFromAngle(angle);
        
        return { distBin, playerDir };
    }

    executeKnightAction(knight, ctx) {
        const angle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
        const direction = this.getDirectionFromAngle(angle);
        knight.facing = direction;
        
        const distanceToPlayer = Phaser.Math.Distance.Between(knight.x, knight.y, this.hero.x, this.hero.y);
        const lungeSpeed = 3;
        
        knight.lastState  = this.getKnightState(knight);
        knight.lastAction = ctx.action;

        switch(ctx.action) {
            case 'attack':
                if (distanceToPlayer < 100) { // Only attack if close enough
                    // Check if knight has enough stamina for attack
                    if (knight.stamina >= 15) {
                        this.performAttack(knight, 'melee');
                        return 'SUCCESS';
                    } else {
                
                        return 'FAILURE';
                    }
                }
                return 'FAILURE';
                
            case 'approach':
                if (distanceToPlayer > 60 && !knight.movementDisabled) {
                    // Check stamina for approach (minimal cost)
                    if (knight.stamina >= 5) {
                        // Check if movement would cause collision with player
                        const moveDistance = 2 * 8; // speed * frames (rough estimate)
                        if (distanceToPlayer > moveDistance + 40) { // 40px buffer to prevent overlap
                    
                            knight.stamina -= 5;
                            knight.staminaRegenDelay = 250; // 0.25s delay for light movement
                            knight.currentMovement = 'approach';
                            knight.movementDuration = 500; // Move for 500ms
                            knight.movementAngle = angle; // Store direction to player
                            knight.movementDirection = direction;
                            return 'SUCCESS';
                        } else {

                            return 'FAILURE';
                        }
                    } else {

                        return 'FAILURE';
                    }
                } else if (knight.movementDisabled) {

                    return 'FAILURE';
                } else {

                    knight.setVelocity(0, 0);
                    knight.anims.play(`idle-${direction}`, true);
                    return 'SUCCESS';
                }
                
            case 'lunge_left':
                // Check stamina and movement disability for lunge (higher cost)
                if (knight.stamina >= 20 && !knight.movementDisabled) {
                    knight.stamina -= 20;
                    knight.staminaRegenDelay = 400; // 0.4s delay for a lunge
                    knight.currentMovement = 'lunge_left';
                    knight.movementDuration = 300; // Lunge for 300ms
                    knight.movementAngle = angle - Math.PI/2; // Store left angle
                    knight.movementDirection = direction; // Face towards player
                    return 'SUCCESS';
                } else if (knight.movementDisabled) {
                    return 'FAILURE';
                } else {

                    return 'FAILURE';
                }
                
            case 'lunge_right':
                // Check stamina and movement disability for lunge (higher cost)
                if (knight.stamina >= 20 && !knight.movementDisabled) {
                    knight.stamina -= 20;
                    knight.staminaRegenDelay = 400; // 0.4s delay for a lunge
                    knight.currentMovement = 'lunge_right';
                    knight.movementDuration = 300; // Lunge for 300ms
                    knight.movementAngle = angle + Math.PI/2; // Store right angle
                    knight.movementDirection = direction; // Face towards player
                    return 'SUCCESS';
                } else if (knight.movementDisabled) {
                    return 'FAILURE';
                } else {

                    return 'FAILURE';
                }
                
            default:
                knight.setVelocity(0, 0);
                knight.anims.play(`idle-${direction}`, true);
                return 'SUCCESS';
        }
    }

    update(time, delta) {
        

        if (time - this.lastScreenshotTime > this.screenshotInterval) {
            this.takeScreenshot();
            this.lastScreenshotTime = time;
        }

        if (this.gameOverActive) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
                saveQ();                // persist learning before restart
                this.scene.restart();
            }
            return; // Lock all other updates
        }

        if (this.isDeathSequenceActive) {
            this.hero.setVelocity(0, 0);
            this.purpleKnight.setVelocity(0, 0);
            return;
        }

        // 3.  Small time-penalty every 1000 ms so knight doesn’t idle
        if (time - this.lastRewardTick > 1000) {
            this.lastRewardTick = time;
            if (this.purpleKnight.lastState && this.purpleKnight.lastAction) {
                const next = this.getKnightState(this.purpleKnight);
                updateQ(this.purpleKnight.lastState,
                        this.purpleKnight.lastAction,
                        -1,   // tiny cost for standing around
                        next);
            }
        }

        // Handle stamina updates for both characters every frame
        this.updateStamina(delta);

        // --- Purple Knight AI with Q-Learning ---
        const knight = this.purpleKnight;
        if (knight.active) {
            if (knight.isDead) {
                return;
            }
            
            const knightAnim = knight.anims.currentAnim;
            const isKnightInAction = (knightAnim && (knightAnim.key.startsWith('take-damage-') || knightAnim.key.startsWith('shield-block-'))) || knight.isTakingDamage || knight.isAttacking || knight.isRecovering;

            // Update action cooldown
            if (knight.actionCooldown > 0) {
                knight.actionCooldown -= delta;
            }
            
            // Update movement duration and handle ongoing movement
            if (knight.currentMovement && knight.movementDuration > 0) {
                knight.movementDuration -= delta;
                
                // Use stored movement direction and angle (don't recalculate)
                if (knight.currentMovement === 'approach') {
                    // Check distance to player to prevent overshooting
                    const currentDistance = Phaser.Math.Distance.Between(knight.x, knight.y, this.hero.x, this.hero.y);
                    
                    if (currentDistance > 70) { // Safe distance to continue moving
                        const knightSpeed = Math.min(2, (currentDistance - 60) / 10); // Slow down as getting closer
                        const moveVector = new Phaser.Math.Vector2(
                            Math.cos(knight.movementAngle) * knightSpeed,
                            Math.sin(knight.movementAngle) * knightSpeed
                        );
                        knight.setStatic(false); // Allow movement temporarily
                        knight.body.collisionFilter.mask = 0x0004; // Only collide with walls, not hero
                        knight.setVelocity(moveVector.x, moveVector.y);
                        knight.anims.play(`walk-${knight.movementDirection}`, true);
                    } else {
                        knight.movementDuration = 0; // Force stop
                    }
                } else if (knight.currentMovement === 'lunge_left') {
                    const lungeSpeed = 4;
                    const leftVector = new Phaser.Math.Vector2(
                        Math.cos(knight.movementAngle) * lungeSpeed,
                        Math.sin(knight.movementAngle) * lungeSpeed
                    );
                    knight.setStatic(false);
                    knight.body.collisionFilter.mask = 0x0004;
                    knight.setVelocity(leftVector.x, leftVector.y);
                    if (!knight.anims.isPlaying || !knight.anims.currentAnim.key.startsWith('rolling-')) {
                        knight.anims.play(`rolling-${knight.movementDirection}`, true);
                    }
                } else if (knight.currentMovement === 'lunge_right') {
                    const lungeSpeed = 4;
                    const rightVector = new Phaser.Math.Vector2(
                        Math.cos(knight.movementAngle) * lungeSpeed,
                        Math.sin(knight.movementAngle) * lungeSpeed
                    );
                    knight.setStatic(false);
                    knight.body.collisionFilter.mask = 0x0004;
                    knight.setVelocity(rightVector.x, rightVector.y);
                    if (!knight.anims.isPlaying || !knight.anims.currentAnim.key.startsWith('rolling-')) {
                        knight.anims.play(`rolling-${knight.movementDirection}`, true);
                    }
                }
                
                if (knight.movementDuration <= 0) {
                    knight.currentMovement = null;
                    knight.setVelocity(0, 0);
                    knight.setStatic(true);
                    knight.body.collisionFilter.mask = 0x0005;
                    const currentAngle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
                    const currentDirection = this.getDirectionFromAngle(currentAngle);
                    knight.facing = currentDirection;
                    knight.anims.play(`idle-${currentDirection}`, true);
                }
            }

            if (!isKnightInAction && knight.actionCooldown <= 0 && !knight.currentMovement && knight.staminaRegenDelay <= 0) {
                const prevState = this.getKnightState(knight);
                const prevAction = chooseAction(prevState);
                const ctx = { action: prevAction };
                
                this.executeKnightAction(knight, ctx);
                this.logEvt(knight, prevAction);
                
                if (prevAction === 'attack') {
                    knight.actionCooldown = 800;
                } else {
                    knight.actionCooldown = 200;
                }
            }
        }

        if (this.redBoundaries && this.redBoundaries.visible) {
            this.redBoundaries.clear();
            this.redBoundaries.lineStyle(2, 0xff0000, 0.8);
            this.boundaryRects.forEach(r => {
                this.redBoundaries.strokeRect(r.x, r.y, r.w, r.h);
            });
            // Draw knight collision circle
            this.redBoundaries.strokeCircle(this.purpleKnight.x, this.purpleKnight.y, 42);
            // Draw hero collision circle  
            this.redBoundaries.strokeCircle(this.hero.x, this.hero.y, 42);
        }
        if (this.blueBoundaries && this.blueBoundaries.visible) {
            this.blueBoundaries.clear();
            this.blueBoundaries.lineStyle(2, 0x0000ff, 0.8);
            const heroCenterX = this.hero.x;
            const heroCenterY = this.hero.y;
            const heroRadius = 42;
            this.blueBoundaries.strokeCircle(heroCenterX, heroCenterY, heroRadius);
            for (let i = 0; i < 8; i++) {
                const angle = i * 45;
                const rad = Phaser.Math.DegToRad(angle);
                const endX = heroCenterX + heroRadius * Math.cos(rad);
                const endY = heroCenterY + heroRadius * Math.sin(rad);
                this.blueBoundaries.beginPath();
                this.blueBoundaries.moveTo(heroCenterX, heroCenterY);
                this.blueBoundaries.lineTo(endX, endY);
                this.blueBoundaries.strokePath();
            }
        }
        if (this.greenBoundaries && this.greenBoundaries.visible) {
            this.greenBoundaries.clear();
            this.greenBoundaries.lineStyle(2, 0x00ff00, 0.8);
            const knightCenterX = this.purpleKnight.x;
            const knightCenterY = this.purpleKnight.y;
            const knightRadius = 42;
            this.greenBoundaries.strokeCircle(knightCenterX, knightCenterY, knightRadius);
            for (let i = 0; i < 8; i++) {
                const angle = i * 45;
                const rad = Phaser.Math.DegToRad(angle);
                const endX = knightCenterX + knightRadius * Math.cos(rad);
                const endY = knightCenterY + knightRadius * Math.sin(rad);
                this.greenBoundaries.beginPath();
                this.greenBoundaries.moveTo(knightCenterX, knightCenterY);
                this.greenBoundaries.lineTo(endX, endY);
                this.greenBoundaries.strokePath();
            }
        }

        // --- Hero Input & Movement ---
        const { left, right, up, down, space, m, r, k, n, s, b, f, c } = this.keys;
        
        // Xbox controller input
        let gamepadInput = {
            left: false, right: false, up: false, down: false,
            space: false, attack: false, melee2: false, special1: false, 
            block: false, frontFlip: false
        };
        
        // Try to detect gamepad during gameplay using native API
        if (!this.gamepad && navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i] && gamepads[i].connected) {
                    this.gamepad = gamepads[i];
                    this.logEvt(this.hero, 'controller_detected_runtime');
                    break;
                }
            }
        }
        
        // Use native gamepad API for input
        if (this.gamepad && this.gamepad.connected) {
            // Get fresh gamepad state (required for native API)
            const freshGamepads = navigator.getGamepads();
            const pad = freshGamepads[this.gamepad.index];
            
            if (pad) {
                // Left stick for movement (axes 0 and 1)
                const leftStickX = pad.axes[0];
                const leftStickY = pad.axes[1];
                const deadzone = 0.3;
                
                if (leftStickX < -deadzone) gamepadInput.left = true;
                if (leftStickX > deadzone) gamepadInput.right = true;
                if (leftStickY < -deadzone) gamepadInput.up = true;
                if (leftStickY > deadzone) gamepadInput.down = true;
                
                // Button mappings (Xbox controller - new layout)
                gamepadInput.frontFlip = pad.buttons[0].pressed; // A button - dodge (front flip)
                gamepadInput.block = pad.buttons[1].pressed; // B button - block
                gamepadInput.attack = pad.buttons[2].pressed; // X button - melee
                gamepadInput.melee2 = pad.buttons[3].pressed; // Y button - melee2
                gamepadInput.special1 = pad.buttons[7].pressed; // RT - special1
                gamepadInput.space = pad.buttons[4].pressed; // LB (Left Shoulder) - run
                

            }
        }

        if (this.hero.isAttacking) {
            this.hero.setVelocity(0, 0); // Ensure no movement during attack
            return;
        }
        
        const currentAnim = this.hero.anims.currentAnim;
        const isBlocking = currentAnim && (currentAnim.key.startsWith('shield-block-start-') || currentAnim.key.startsWith('shield-block-mid-'));
        const isActionInProgress = this.hero.isAttacking || (currentAnim && (currentAnim.key.startsWith('melee-') || currentAnim.key.startsWith('rolling-') || currentAnim.key.startsWith('take-damage-') || currentAnim.key.startsWith('kick-') || currentAnim.key.startsWith('melee2-') || currentAnim.key.startsWith('special1-') || currentAnim.key.startsWith('front-flip-')) && this.hero.anims.isPlaying);

        if (isBlocking) {
            this.hero.setVelocity(0, 0);
            if (b.isUp && !gamepadInput.block) {
                this.hero.isBlocking = false;
                this.hero.anims.play(`idle-${this.facing}`, true);
            }
            return;
        }

        if (isActionInProgress) {
            if (currentAnim.key.startsWith('rolling-') || currentAnim.key.startsWith('front-flip-')) {
                const moveVelocity = new Phaser.Math.Vector2();
                switch (this.facing) {
                    case 'n': moveVelocity.y = -1; break;
                    case 's': moveVelocity.y = 1; break;
                    case 'w': moveVelocity.x = -1; break;
                    case 'e': moveVelocity.x = 1; break;
                    case 'nw': moveVelocity.set(-1, -1); break;
                    case 'ne': moveVelocity.set(1, -1); break;
                    case 'sw': moveVelocity.set(-1, 1); break;
                    case 'se': moveVelocity.set(1, 1); break;
                }
                const speed = currentAnim.key.startsWith('rolling-') ? 8 : 6; // Matter physics scaling
                moveVelocity.normalize().scale(speed);
                this.hero.setVelocity(moveVelocity.x, moveVelocity.y);
            } else {
                this.hero.setVelocity(0, 0);
            }
            return;
        }

        // Handle actions (keyboard + gamepad with native API)
        const currentGamepadState = this.gamepad ? {
            attack: gamepadInput.attack,
            melee2: gamepadInput.melee2,
            special1: gamepadInput.special1,
            frontFlip: gamepadInput.frontFlip,
            block: gamepadInput.block
        } : {};

        if (Phaser.Input.Keyboard.JustDown(f) || (gamepadInput.frontFlip && !this.lastGamepadState?.frontFlip)) {
            // Check stamina for dodge
            if (this.hero.stamina >= 30) {
                this.hero.stamina -= 30;
                this.hero.anims.play(`front-flip-${this.facing}`, true);
                this.logEvt(this.hero, 'front_flip');
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(b) || (gamepadInput.block && !this.lastGamepadState?.block)) {
            // Check if blocking is disabled due to stamina exhaustion
            if (this.hero.blockDisabled) {
                return;
            }
            this.hero.setVelocity(0, 0);
            this.hero.isBlocking = true;
            this.hero.anims.play(`shield-block-start-${this.facing}`, true);
            this.logEvt(this.hero, 'block');
            return;
        }
        
        if (Phaser.Input.Keyboard.JustDown(m) || (gamepadInput.attack && !this.lastGamepadState?.attack)) {
            this.performAttack(this.hero, 'melee');
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(n) || (gamepadInput.melee2 && !this.lastGamepadState?.melee2)) {
            this.performAttack(this.hero, 'melee2');
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(c) || (gamepadInput.special1 && !this.lastGamepadState?.special1)) {
            this.performAttack(this.hero, 'special1');
            return;
        }


        const velocity = new Phaser.Math.Vector2();

        // --- Determine direction from key presses ---
        let direction = this.facing;
        // Consider both keyboard and gamepad for direction
        const upPressed = up.isDown || gamepadInput.up;
        const downPressed = down.isDown || gamepadInput.down;
        const leftPressed = left.isDown || gamepadInput.left;
        const rightPressed = right.isDown || gamepadInput.right;
        
        if (upPressed) {
            if (leftPressed) direction = 'nw';
            else if (rightPressed) direction = 'ne';
            else direction = 'n';
        } else if (downPressed) {
            if (leftPressed) direction = 'sw';
            else if (rightPressed) direction = 'se';
            else direction = 's';
        } else if (leftPressed) {
            direction = 'w';
        } else if (rightPressed) {
            direction = 'e';
        }

        // --- Set velocity based on keys pressed or gamepad ---
        if (leftPressed) velocity.x = -1;
        else if (rightPressed) velocity.x = 1;
        if (upPressed) velocity.y = -1;
        else if (downPressed) velocity.y = 1;
        
        // --- Play animations and log movement ---
        if (velocity.length() > 0) {
            this.facing = direction;

            const isRunning = space.isDown || gamepadInput.space;
            const currentSpeed = isRunning ? 5 : 3; // Matter physics scaling
            velocity.normalize().scale(currentSpeed);
            const animPrefix = isRunning ? 'run' : 'walk';
            
            // Running stamina cost
            if (isRunning) {
                if (this.hero.stamina > 0) {
                    this.hero.stamina -= 0.5; // Drain stamina while running
                } else {
                    // Force walking if no stamina
                    const currentSpeed = 3;
                    velocity.normalize().scale(currentSpeed);
                    const animPrefix = 'walk';
                }
            }
            
            this.hero.anims.play(`${animPrefix}-${this.facing}`, true);
            
            // Log movement (throttled to avoid spam)
            if (!this.lastMoveLog || this.time.now - this.lastMoveLog > 500) {
                this.logEvt(this.hero, isRunning ? 'running' : 'walking');
                this.lastMoveLog = this.time.now;
            }
        } else {
            this.hero.anims.play(`idle-${this.facing}`, true);
        }

        this.hero.setVelocity(velocity.x, velocity.y);
        
        // Ensure no visual rotation
        this.hero.setRotation(0);
        this.purpleKnight.setRotation(0);
        
        // Update external debug panel with latest AI metrics
        const last = this.aiLog[this.aiLog.length-1]||{};
        if (last.state) {
            document.getElementById('debug-state').textContent = `${last.state.distBin}-${last.state.playerDir}`;
            document.getElementById('debug-action').textContent = last.action || '-';
            document.getElementById('debug-cooldown').textContent = `${Math.round(this.purpleKnight.actionCooldown)}ms`;
            
            if (last.q) {
                document.getElementById('debug-q-attack').textContent = last.q.attack?.toFixed(2) || '0';
                document.getElementById('debug-q-approach').textContent = last.q.approach?.toFixed(2) || '0';
                document.getElementById('debug-q-lunge-left').textContent = last.q.lunge_left?.toFixed(2) || '0';
                document.getElementById('debug-q-lunge-right').textContent = last.q.lunge_right?.toFixed(2) || '0';
            }
            
            document.getElementById('debug-total-states').textContent = Object.keys(Q).length;
            const hitRate = this.totalActions > 0 ? ((this.hitCount / this.totalActions) * 100).toFixed(1) : '0';
            document.getElementById('debug-hit-rate').textContent = `${hitRate}%`;
            
            // Update Q-value bar chart in HTML
            const row = Q[key(last.state)] || {attack:0,approach:0, lunge_left:0,lunge_right:0};
            const maxWidth = 200;
            const minWidth = 10;
            document.getElementById('q-bar-attack').style.width = Math.max(minWidth, Math.min(maxWidth, row.attack * 20 + 10)) + 'px';
            document.getElementById('q-bar-approach').style.width = Math.max(minWidth, Math.min(maxWidth, row.approach * 20 + 10)) + 'px';
            document.getElementById('q-bar-lunge-left').style.width = Math.max(minWidth, Math.min(maxWidth, row.lunge_left * 20 + 10)) + 'px';
            document.getElementById('q-bar-lunge-right').style.width = Math.max(minWidth, Math.min(maxWidth, row.lunge_right * 20 + 10)) + 'px';
        }
        
        // Stamina regeneration
        this.updateStamina(delta);
        
        // Store gamepad state for next frame comparison (native API)
        if (this.gamepad) {
            this.lastGamepadState = {
                attack: gamepadInput.attack,
                melee2: gamepadInput.melee2,
                special1: gamepadInput.special1,
                frontFlip: gamepadInput.frontFlip,
                block: gamepadInput.block
            };
        }

        // Update player action debug info (safe version)
        try {
            this.updatePlayerDebugInfo();
        } catch (e) {
        }
    }

    updateStamina(delta) {
        // Update stamina regen delay timers
        if (this.hero.staminaRegenDelay > 0) {
            this.hero.staminaRegenDelay -= delta;
        }
        if (this.purpleKnight.staminaRegenDelay > 0) {
            this.purpleKnight.staminaRegenDelay -= delta;
        }

        // Check for stamina exhaustion and disable blocking + movement
        if (this.hero.stamina <= 0 && !this.hero.blockDisabled) {
            this.hero.blockDisabled = true;
            this.hero.blockDisableTimer = 1000; // 1 second in milliseconds

            this.hero.setVelocity(0, 0); // Stop moving immediately

            // Force stop blocking animation if currently blocking
            if (this.hero.anims.currentAnim && this.hero.anims.currentAnim.key.includes('shield-block')) {
                this.hero.isBlocking = false;
                this.hero.anims.play(`idle-${this.facing}`, true);
            }
        }
        
        if (this.purpleKnight.stamina <= 0 && !this.purpleKnight.blockDisabled) {
            this.purpleKnight.blockDisabled = true;
            this.purpleKnight.blockDisableTimer = 1000; // 1 second in milliseconds

            this.purpleKnight.isBlocking = false; // Force stop blocking
            this.purpleKnight.setVelocity(0, 0); // Stop moving immediately
            this.purpleKnight.currentMovement = null; // Cancel any ongoing movement

            // Force stop blocking animation
            const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.purpleKnight.x, this.purpleKnight.y, this.hero.x, this.hero.y));
            this.purpleKnight.anims.play(`idle-${direction}`, true);
        }
        
        // Update disable timers
        if (this.hero.blockDisabled) {
            this.hero.blockDisableTimer -= delta;
            if (this.hero.blockDisableTimer <= 0) {
                this.hero.blockDisabled = false;
                this.hero.stamina = 1; // Jump-start stamina recovery

            }
        }
        
        if (this.hero.movementDisabled) {
            this.hero.movementDisableTimer -= delta;
            if (this.hero.movementDisableTimer <= 0) {
                this.hero.movementDisabled = false;

            }
        }
        
        if (this.purpleKnight.blockDisabled) {
            this.purpleKnight.blockDisableTimer -= delta;
            if (this.purpleKnight.blockDisableTimer <= 0) {
                this.purpleKnight.blockDisabled = false;
                this.purpleKnight.stamina = 1; // Jump-start stamina recovery

            }
        }
        
        if (this.purpleKnight.movementDisabled) {
            this.purpleKnight.movementDisableTimer -= delta;
            if (this.purpleKnight.movementDisableTimer <= 0) {
                this.purpleKnight.movementDisabled = false;

            }
        }
        
        // Regenerate stamina for hero
        if (this.hero.stamina < this.hero.maxStamina && this.hero.staminaRegenDelay <= 0 && !this.hero.blockDisabled) {
            this.hero.stamina += this.hero.staminaRegenRate;
            this.hero.stamina = Math.min(this.hero.stamina, this.hero.maxStamina);
        }
        
        // Regenerate stamina for knight
        if (this.purpleKnight.stamina < this.purpleKnight.maxStamina && this.purpleKnight.staminaRegenDelay <= 0 && !this.purpleKnight.blockDisabled) {
            this.purpleKnight.stamina += this.purpleKnight.staminaRegenRate;
            this.purpleKnight.stamina = Math.min(this.purpleKnight.stamina, this.purpleKnight.maxStamina);
        }

        // Always update stamina bars for immediate feedback
        this.updateStaminaBar();
        this.updateKnightStaminaBar();
    }

    displayEvent(event) {
        const eventsContent = document.getElementById('events-content');
        if (!eventsContent) return;
        
        // Create formatted event display
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        
        // Format the JSON prettily
        const formattedEvent = {
            time: Math.round(event.t),
            actor: event.actor,
            position: `[${Math.round(event.pos[0])}, ${Math.round(event.pos[1])}]`,
            direction: event.dir,
            health: `${Math.round(event.hp * 100)}%`,
            action: event.action
        };
        
        eventDiv.textContent = JSON.stringify(formattedEvent, null, 2);
        
        // Add to top of events panel
        eventsContent.insertBefore(eventDiv, eventsContent.firstChild);
        
        // Keep only last 10 events visible
        while (eventsContent.children.length > 10) {
            eventsContent.removeChild(eventsContent.lastChild);
        }
    }



    updatePlayerDebugInfo() {
        if (!this.keys || !this.debugKeys) return;
        
        const keys = this.debugKeys;
        
        // Determine current action based on actual key states
        let currentAction = 'idle';
        if (this.hero && this.hero.isAttacking) {
            currentAction = `attacking (${this.hero.currentAttackType || 'unknown'})`;
        } else if (keys.B.isDown) {
            currentAction = 'blocking';
        } else if (keys.Q.isDown) {
            currentAction = 'melee attack';
        } else if (keys.E.isDown) {
            currentAction = 'rolling';
        } else if (keys.R.isDown) {
            currentAction = 'kick';
        } else if (keys.F.isDown) {
            currentAction = 'melee2';
        } else if (keys.C.isDown) {
            currentAction = 'special1';
        } else if (keys.V.isDown) {
            currentAction = 'front-flip';
        }
        
        // Determine movement based on actual key states
        let movement = 'stationary';
        if (keys.W.isDown || keys.A.isDown || keys.S.isDown || keys.D.isDown) {
            const speed = keys.SPACE.isDown ? 'running' : 'walking';
            const dirs = [];
            if (keys.W.isDown) dirs.push('up');
            if (keys.S.isDown) dirs.push('down');
            if (keys.A.isDown) dirs.push('left');
            if (keys.D.isDown) dirs.push('right');
            movement = `${speed} (${dirs.join('+')})`;
        }
        
        // Safely update debug panel
        const actionEl = document.getElementById('debug-player-action');
        const facingEl = document.getElementById('debug-player-facing');
        const movementEl = document.getElementById('debug-player-movement');
        
        if (actionEl) actionEl.textContent = currentAction;
        if (facingEl) facingEl.textContent = this.facing || '-';
        if (movementEl) movementEl.textContent = movement;
    }



    takeScreenshot() {
        const mainCanvas = this.game.canvas;
        const screenshotCanvas = document.getElementById('screenshot-canvas');

        if (!screenshotCanvas) {
    
            return;
        }

        screenshotCanvas.width = mainCanvas.width;
        screenshotCanvas.height = mainCanvas.height;

        const context = screenshotCanvas.getContext('2d');
        context.drawImage(mainCanvas, 0, 0, mainCanvas.width, mainCanvas.height);

        const imageData = screenshotCanvas.toDataURL('image/png');
        const metadata = {
            player: {
                hp: this.hero.health / this.hero.maxHealth,
                animation: this.hero.anims.currentAnim ? this.hero.anims.currentAnim.key : 'none'
            },
            enemy: {
                hp: this.purpleKnight.health / this.purpleKnight.maxHealth,
                animation: this.purpleKnight.anims.currentAnim ? this.purpleKnight.anims.currentAnim.key : 'none'
            }
        };

        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'screenshot',
                image: imageData,
                metadata: metadata
            }));
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#000000',
    pixelArt: true,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 },
            enableSleep: false,       // keep bodies active
            positionIterations: 6,    // CCD robustness
            velocityIterations: 6
        }
    },
    scene: [PlayScene]
};

const game = new Phaser.Game(config); 