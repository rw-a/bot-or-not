import child_process from "child_process";
import util from 'util';

const exec = util.promisify(child_process.exec);

export default async function llm(
        model_path: string, 
        prompt: string, 
        stop: string[] = [], 
        max_tokens: number = 128) {
    
    const stop_prompts = stop.map((stop_prompt) => `-r "${stop_prompt}"`).join(" ");
    const command = `./llama-cpp -m "${model_path}" -n ${max_tokens} -p "${prompt}" ${stop_prompts}`;
    
    const { stdout, stderr} = await exec(command);
    return stdout;
}

function main() {
    llm("./open_llama-ggml-q4_0.bin", "Q: What is 2+2? A:", ["\n"]);
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}