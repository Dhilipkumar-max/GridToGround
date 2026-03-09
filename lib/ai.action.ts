import puter from "@heyputer/puter.js";
import { GRIDTOGROUND_RENDER_PROMPT } from "./constants";

export const fetchAsDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
    const dataUrl = sourceImage.startsWith('data:')
        ? sourceImage
        : await fetchAsDataUrl(sourceImage);

    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.split(';')[0].split(':')[1];

    if (!mimeType || !base64Data) throw new Error('Invalid source image payload');

    console.log("Generating 3D view with model: gemini-2.5-flash-image-preview");
    const response = await puter.ai.txt2img(GRIDTOGROUND_RENDER_PROMPT, {
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        input_image: base64Data,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 },
    });

    console.log("Puter AI response:", response);

    let rawImageUrl: string | null = null;
    if (typeof response === 'string') {
        rawImageUrl = response;
    } else if (response && (response as any).src) {
        rawImageUrl = (response as any).src;
    } else if (response instanceof HTMLImageElement) {
        rawImageUrl = response.src;
    }

    console.log("Extracted rawImageUrl:", rawImageUrl ? "data URL present" : "null");

    if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

    const renderedImage = rawImageUrl.startsWith('data:')
        ? rawImageUrl : await fetchAsDataUrl(rawImageUrl);

    return { renderedImage, renderedPath: undefined };
}

export const generate3DLayout = async ({ sourceImage }: Generate3DViewParams) => {
    const dataUrl = sourceImage.startsWith('data:')
        ? sourceImage
        : await fetchAsDataUrl(sourceImage);

    const prompt = `You are a floor-plan analyzer.
Your task is to convert a floor plan image into an accurate structured layout for a 3D scene.

Rules:

1. DO NOT guess or invent rooms.
2. Detect the exact positions of all walls from the image.
3. Use the grid in the image to estimate coordinates.
4. Detect internal walls and outer walls separately.
5. Detect door openings and their orientation.
6. Output precise coordinates so a Three.js scene can recreate the layout exactly.
7. Keep everything aligned to the grid to avoid floating or random placement.
8. Analyze the ACTUAL aspect ratio of the floor plan. If the plan is taller than wide, reflect that in coordinates (e.g., width=10, depth=18). Do NOT force a square.
9. Use a scale of 1 unit = 1 meter.

Steps you must follow:

Step 1: Identify the outer boundary walls. These must form a CLOSED perimeter — the last point must connect back to the first.
Step 2: Detect every internal wall segment. These divide the interior into rooms.
Step 3: Detect doors (gaps in walls). If a door exists on a wall, that wall must be SPLIT into two segments with a gap between them.
Step 4: Detect room regions created by those walls and label them with their type (bedroom, bathroom, kitchen, living, hallway, etc.).
Step 5: Convert everything into coordinates relative to the grid. Place (0,0) at the top-left corner of the floor plan so all coordinates are positive.

Return ONLY JSON in this format:

{
"gridSize": 1,
"walls":[
{"x1":0,"z1":0,"x2":10,"z2":0},
{"x1":10,"z1":0,"x2":10,"z2":18},
{"x1":10,"z1":18,"x2":0,"z2":18},
{"x1":0,"z1":18,"x2":0,"z2":0}
],
"internalWalls":[
{"x1":5,"z1":0,"x2":5,"z2":9},
{"x1":0,"z1":9,"x2":10,"z2":9}
],
"doors":[
{"wall":"internal","x":5,"z":4.5,"width":1,"rotation":90},
{"wall":"internal","x":3,"z":9,"width":1,"rotation":0}
],
"rooms":[
{"type":"bedroom","center":[2.5,4.5]},
{"type":"bathroom","center":[7.5,4.5]},
{"type":"living","center":[5,13.5]}
]
}

Important:
The coordinates must match the exact wall positions from the floor plan image.
Do not randomize furniture or walls.
Only return structured geometry that can be directly converted into Three.js walls.`;

    console.log("Generating 3D layout with model: gemini-2.5-flash");
    const response: any = await puter.ai.chat(prompt as any, {
        provider: "gemini",
        model: "gemini-2.5-flash",
        image: dataUrl,
    } as any);

    console.log("Puter AI response (layout):", response);

    let layoutJson = null;
    try {
        const textResponse = response?.message?.content?.[0]?.text || response?.toString() || "";
        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            layoutJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
    } catch (e) {
        console.error("Failed to parse JSON response:", e);
    }

    return layoutJson;
}
