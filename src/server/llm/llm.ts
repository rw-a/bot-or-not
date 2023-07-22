import child_process from "child_process";
import util from 'util';

const exec = util.promisify(child_process.exec);

export default async function llm(
        exec_path: string,
        model_path: string, 
        prompt: string, 
        stop: string[] = [], 
        max_tokens: number = 128) {
    
    const stop_prompts = (stop) ? stop.map((stop_prompt) => `-r "${stop_prompt}"`).join(" ") : "";
    const command = `${exec_path} -m "${model_path}" -n ${max_tokens} -p "${prompt}" ${stop_prompts}`;
    
    const { stdout, stderr} = await exec(command);
    return stdout;
}

function main() {
    llm("./llama-cpp", "./open_llama-ggml-q4_0.bin", "Q: What is 2+2? A:", ["\n"]);
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}