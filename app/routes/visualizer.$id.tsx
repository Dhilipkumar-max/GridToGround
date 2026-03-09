import { useNavigate, useOutletContext, useParams, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { generate3DView, generate3DLayout } from "../../lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import Button from "../../Components/ui/Button";
import { createProject, getProjectById } from "../../lib/puter.action";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useOutletContext<AuthContext>()

    const locationState = location.state as VisualizerLocationState;

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(locationState?.initialImage ? {
        id: id || '',
        name: locationState.name,
        sourceImage: locationState.initialImage,
        renderedImage: locationState.initialRendered || null,
        timestamp: Date.now()
    } : null);
    const [isProjectLoading, setIsProjectLoading] = useState(!locationState?.initialImage);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isProcessing3D, setIsProcessing3D] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(locationState?.initialRendered || null);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => navigate('/');
    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `gridtoground-${id || 'design'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const runGeneration = async (item: DesignItem) => {
        if (!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            setError(null);
            const result = await generate3DView({ sourceImage: item.sourceImage });

            if (result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                }

                const saved = await createProject({ item: updatedItem, visibility: "private" })

                if (saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            } else {
                setError("AI returned an empty result. Please check if your prompt or image is valid.");
            }
        } catch (err: any) {
            console.error('Generation failed: ', err)
            setError(err?.message || "Something went wrong during generation. Check console for details.");
        } finally {
            setIsProcessing(false);
        }
    }

    const run3DGeneration = async () => {
        if (!project || !project.sourceImage) return;

        try {
            setIsProcessing3D(true);
            setError(null);

            if (project.layoutJson) {
                navigate(`/3d-visualizer/${project.id}`, { state: project });
                return;
            }

            const layoutJson = await generate3DLayout({ sourceImage: project.sourceImage });

            if (layoutJson) {
                const updatedItem = {
                    ...project,
                    layoutJson,
                    timestamp: Date.now(),
                };

                const saved = await createProject({ item: updatedItem, visibility: "private" });

                if (saved) {
                    setProject(saved);
                    navigate(`/3d-visualizer/${saved.id}`, { state: saved });
                } else {
                    navigate(`/3d-visualizer/${updatedItem.id || id}`, { state: updatedItem });
                }
            } else {
                setError("AI failed to generate 3D layout. Please try again.");
            }
        } catch (err: any) {
            console.error('3D Generation failed: ', err)
            setError(err?.message || "Something went wrong during 3D generation.");
        } finally {
            setIsProcessing3D(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            const fetchedProject = await getProjectById({ id });

            if (!isMounted) return;

            setProject(fetchedProject);
            setCurrentImage(fetchedProject?.renderedImage || null);
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        )
            return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />

                    <span className="name">GridToGround</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">Created by You</p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={run3DGeneration}
                                className="build-3d"
                                disabled={!currentImage || isProcessing3D}
                            >
                                <Box className="w-4 h-4 mr-2" /> {isProcessing3D ? "Building..." : "Build 3D"}
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button size="sm" onClick={() => { }} className="share">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? 'is-processing' : ''}`}>
                        {error && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-50/90 backdrop-blur-sm p-6 text-center">
                                <div className="max-w-xs">
                                    <p className="text-red-600 font-bold mb-2">Generation Failed</p>
                                    <p className="text-red-500 text-sm">{error}</p>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={() => project && runGeneration(project)}>
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        )}
                        {currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img src={project?.sourceImage} alt="Original" className="render-fallback" />
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">Generating your 3D visualization</span>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                        </div>
                        <div className="hint">Drag to compare</div>
                    </div>

                    <div className="compare-stage">
                        {project?.sourceImage && currentImage ? (
                            <ReactCompareSlider
                                defaultValue={50}
                                style={{ width: '100%', height: 'auto' }}
                                itemOne={
                                    <ReactCompareSliderImage src={project?.sourceImage} alt="before" className="compare-img" />
                                }
                                itemTwo={
                                    <ReactCompareSliderImage src={currentImage || project?.renderedImage || undefined} alt="after" className="compare-img" />
                                }
                            />
                        ) : (
                            <div className="compare-fallback">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Before" className="compare-img" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
export default VisualizerId
