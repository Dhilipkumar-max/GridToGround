import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('visualizer/:id', './routes/visualizer.$id.tsx'),
    route('3d-visualizer/:id', './routes/3d-visualizer.$id.tsx')
] satisfies RouteConfig;
