import { execSync } from "child_process";

export default function llm(
        model_path: string, 
        prompt: string, 
        stop: string[] = [], 
        max_tokens: number = 128) {
    
    const stops = stop.map((stop_prompt) => "-r " + stop_prompt);
    // const output = spawnSync("./llama-cpp", [`-m "${model_path}"`, `-n ${max_tokens}`, `-p "${prompt}"`]);
    const command = `./llama-cpp -m "${model_path}" -n ${max_tokens} -p "${prompt}" ${stops.join("")}`;
    const output = execSync(command);
    console.log(output.toString());
    return output;
}

llm("./open_llama-ggml-q4_0.bin", "Q: What is 2+2? A:", [], 32);