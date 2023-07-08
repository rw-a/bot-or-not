import { exec } from "child_process";

export default function llm(
        model_path: string, 
        prompt: string, 
        stop: string[] = [], 
        max_tokens: number = 128) {
    
    const stops = stop.map((stop_prompt) => "-r " + stop_prompt).join(" ");

    const command = `./main -m ${model_path} -n ${max_tokens} -p "${prompt} ${stops}"`;
    console.log(command);
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
    
}

// llm("open_llama-ggml-q4_0.bin", "Q: What is 2+2?");