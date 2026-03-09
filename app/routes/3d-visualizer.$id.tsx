import { useNavigate, useOutletContext, useParams, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Box, Share2, X } from "lucide-react";
import Button from "../../Components/ui/Button";
import { getProjectById } from "../../lib/puter.action";

const ThreeDVisualizer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const mountRef = useRef<HTMLDivElement>(null);
    const locationState = location.state as any;

    const [project, setProject] = useState<DesignItem | null>(locationState || null);
    const [isLoading, setIsLoading] = useState(!locationState?.layoutJson);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => navigate(-1);

    useEffect(() => {
        let isMounted = true;
        const loadProject = async () => {
            if (!id || project?.layoutJson) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const fetchedProject = await getProjectById({ id });

            if (!isMounted) return;

            if (fetchedProject?.layoutJson) {
                setProject(fetchedProject);
            } else {
                setError("No 3D layout data found for this project.");
            }
            setIsLoading(false);
        };

        loadProject();
        return () => { isMounted = false; };
    }, [id]);

    useEffect(() => {
        if (!mountRef.current || isLoading || !project?.layoutJson) return;

        // Ensure we don't recreate the scene multiple times
        if (mountRef.current.children.length > 0) {
            mountRef.current.innerHTML = '';
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        // Parse Layout Data
        const layoutData = project.layoutJson;
        const outerWalls = layoutData.walls || [];
        const internalWalls = layoutData.internalWalls || [];
        const doors = layoutData.doors || [];
        const rooms = layoutData.rooms || [];

        // Calculate bounds for dynamic grid and camera
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        const updateBounds = (x: number, z: number) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        };
        [...outerWalls, ...internalWalls].forEach((w: any) => {
            if (w.x1 !== undefined) {
                updateBounds(w.x1, w.z1);
                updateBounds(w.x2, w.z2);
            }
        });

        // Fallback bounds if no walls found
        if (minX === Infinity) { minX = 0; maxX = 20; minZ = 0; maxZ = 20; }

        const layoutWidth = maxX - minX;
        const layoutDepth = maxZ - minZ;
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const gridSize = Math.max(layoutWidth, layoutDepth) + 4;

        // Add Grid Helper centered on layout
        const gridHelper = new THREE.GridHelper(gridSize, Math.round(gridSize), 0xcccccc, 0xe0e0e0);
        gridHelper.position.set(centerX, 0, centerZ);
        scene.add(gridHelper);

        // Add Floor
        const floorGeometry = new THREE.PlaneGeometry(layoutWidth + 0.5, layoutDepth + 0.5);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xfafafa, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(centerX, 0.01, centerZ);
        scene.add(floor);

        // Add Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(centerX + 10, 25, centerZ + 10);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(centerX - 10, 15, centerZ - 10);
        scene.add(directionalLight2);

        // Wall creation helper
        const WALL_HEIGHT = 3;
        const WALL_THICKNESS = 0.2;

        const createWall = (x1: number, z1: number, x2: number, z2: number, material: THREE.Material) => {
            const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
            if (length <= 0.01) return;

            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(length, WALL_HEIGHT, WALL_THICKNESS),
                material
            );

            wall.position.set((x1 + x2) / 2, WALL_HEIGHT / 2, (z1 + z2) / 2);
            wall.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
            scene.add(wall);
        };

        // Outer walls (darker, thicker feel)
        const outerWallMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        outerWalls.forEach((w: any) => {
            if (w.x1 !== undefined && w.x2 !== undefined) {
                createWall(w.x1, w.z1, w.x2, w.z2, outerWallMaterial);
            }
        });

        // Internal walls (slightly lighter)
        const internalWallMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        internalWalls.forEach((w: any) => {
            if (w.x1 !== undefined && w.x2 !== undefined) {
                createWall(w.x1, w.z1, w.x2, w.z2, internalWallMaterial);
            }
        });

        // Doors (brown, slightly shorter, tilted open)
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
        doors.forEach((d: any) => {
            const width = d.width || 1;
            const doorMesh = new THREE.Mesh(
                new THREE.BoxGeometry(width, 2.4, 0.08),
                doorMaterial
            );
            doorMesh.position.set(d.x, 2.4 / 2, d.z);
            // Convert rotation from degrees if provided
            const baseRot = (d.rotation || 0) * (Math.PI / 180);
            doorMesh.rotation.y = baseRot + Math.PI / 5; // slightly ajar
            scene.add(doorMesh);
        });

        // Room labels as floating sprites
        rooms.forEach((room: any) => {
            if (!room.center || !room.type) return;

            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.roundRect(0, 0, 256, 64, 8);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.font = 'bold 24px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(room.type.toUpperCase(), 128, 32);
            }

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(room.center[0], WALL_HEIGHT + 0.5, room.center[1]);
            sprite.scale.set(3, 0.75, 1);
            scene.add(sprite);
        });

        // Set up Camera — auto-center on layout
        const container = mountRef.current;
        const maxDim = Math.max(layoutWidth, layoutDepth);
        const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(centerX, maxDim * 1.2, centerZ + maxDim * 0.8);

        // Set up Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Add Controls — orbit around layout center
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(centerX, 0, centerZ);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Animation Loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle Resize
        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (container && renderer.domElement === container.firstChild) {
                container.removeChild(renderer.domElement);
            }
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();
            controls.dispose();
        };

    }, [project, isLoading]);

    return (
        <div className="visualizer h-screen flex flex-col">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />
                    <span className="name">GridToGround <span className="text-gray-400 text-sm ml-2">3D Visualizer</span></span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Back
                </Button>
            </nav>

            <section className="content flex-1 max-h-[calc(100vh-64px)] overflow-hidden">
                <div className="panel w-full flex flex-col h-full border-0">
                    <div className="panel-header py-4">
                        <div className="panel-meta">
                            <p>3D Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                        </div>
                        <div className="panel-actions">
                            <Button size="sm" onClick={() => { }} className="share">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>

                    <div className="render-area w-full flex-1 relative bg-gray-100 rounded-b-xl overflow-hidden shadow-inner">
                        {isLoading ? (
                            <div className="absolute inset-0 z-50 flex items-center justify-center">
                                <div className="rendering-card">Loading 3D Scene...</div>
                            </div>
                        ) : error ? (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-50/90 backdrop-blur-sm p-6 text-center">
                                <div className="max-w-xs">
                                    <p className="text-red-600 font-bold mb-2">Error</p>
                                    <p className="text-red-500 text-sm">{error}</p>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={handleBack}>Go Back</Button>
                                </div>
                            </div>
                        ) : (
                            <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-move" />
                        )}

                        {!isLoading && !error && (
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-gray-700 shadow-sm border border-gray-200 pointer-events-none">
                                Left-click to rotate • Right-click to pan • Scroll to zoom
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ThreeDVisualizer;
