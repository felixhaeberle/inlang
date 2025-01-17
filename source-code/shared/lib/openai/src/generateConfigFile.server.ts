import { mockEnvironment, ValidateConfigException, validateConfigFile } from "@inlang/core/test"
import type { Result } from "@inlang/core/utilities"
import express from "express"
import { Volume } from "memfs"
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai"
import { ENDPOINT } from "./generateConfigFile.js"
import bodyParser from "body-parser"
import { z } from "zod"
import dedent from "dedent"

export const generateConfigFileRoute = express.Router()
generateConfigFileRoute.use(bodyParser.json({ limit: "50mb" }))

generateConfigFileRoute.post(ENDPOINT, async (req, res) => {
	try {
		const { filesystemAsJson } = z
			.object({ filesystemAsJson: z.record(z.string()) })
			.parse(req.body)
		const result = await _generateConfigFileServer({ filesystemAsJson })
		if (result[1]) {
			console.log(result[1])
		}
		res.json(result)
	} catch (error) {
		res.status(500)
		res.send()
	}
})

const openapi = new OpenAIApi(
	new Configuration({
		apiKey: process.env.OPEN_AI_KEY,
	}),
)

export class GenerateConfigFileException extends Error {
	readonly #id = "GenerateConfigFileException"
}

/**
 * Internal wrapper to test the function without the requirement to run a server during testing.
 */
export async function _generateConfigFileServer(args: {
	filesystemAsJson: Record<string, string>
	// messages is required to recursively call the function
	// upon a failed config file generation
	messages?: CreateChatCompletionRequest["messages"]
}): Promise<Result<string, GenerateConfigFileException | ValidateConfigException | Error>> {
	const fs = Volume.fromJSON(args.filesystemAsJson, "/").promises
	const env = await mockEnvironment({ copyDirectory: { fs: fs, paths: ["/"] } })
	if (args.messages === undefined) {
		const _prompt = prompt(Object.keys(args.filesystemAsJson))
		if (_prompt.length > 2000) {
			console.log(Object.keys(args.filesystemAsJson).toString().length)
			return [
				undefined,
				new Error(dedent`
The current working directory contains too many file(paths).

Solution: Are you you in the root of your repository?

Explanation: The maximum prompt for the OpenAI API is 2000 characters. The current prompt is ${_prompt.length} characters.
			
			`),
			]
		}
		args.messages = [{ role: "system", content: prompt(Object.keys(args.filesystemAsJson)) }]
	} else if (args.messages.length > 6) {
		return [
			undefined,
			new GenerateConfigFileException(
				"Couldn't generate a config file. " + args.messages.at(-1)!.content,
			),
		]
	}
	try {
		const response = await openapi.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: args.messages,
		})
		const configFile = response.data.choices.at(-1)!.message!.content
		const [, exception] = await validateConfigFile({ file: configFile, env })
		if (!exception) {
			return [configFile, undefined]
		}
		return _generateConfigFileServer({
			...args,
			messages: [
				...args.messages,
				response.data.choices.at(-1)!.message!,
				{
					role: "user",
					content:
						"The config does not work. Try again and only reply with the config. No explanations. " +
						exception.message,
				},
			],
		})
	} catch (error) {
		console.error(error)
		return [undefined, error as Error]
	}
}

/**
 * The prompt for the openai api.
 */
function prompt(filePaths: string[]): string {
	return `
  You are supposed to write a config file for a service called "inlang" that exports a defineConfig function.

  Only reply with the code. Don't wrap the code in \`\`\`. Don't write explanations.

  The repository for the config file has the following files:

  ${filePaths.join("\n")}
  
	Here is an example config: 
	\`\`\`
  export async function defineConfig(env) {
    // imports happen from jsdelivr with the following pattern:
    // https://cdn.jsdelivr.net/gh/{owner}/{repo}@{version}/{path}
    // recommended to use major version pinning @1 instead of @1.0.0
    const plugin = await env.$import(
      // for .json files
      // "https://cdn.jsdelivr.net/gh/samuelstroschein/inlang-plugin-json@1/dist/index.js"
      // for .po files
      // "https://cdn.jsdelivr.net/gh/jannesblobel/inlang-plugin-po@1/dist/index.js"
    );

    const pluginConfig = {
			// the path for resource files. usually nested in a directory named locales, 
			// translations or i18n
      pathPattern: "./locales/{language}.json",
    };

    return {
      referenceLanguage: "en",
      languages: await plugin.getLanguages({
        ...env,
        pluginConfig,
      }),
      readResources: (args) =>
        plugin.readResources({ ...args, ...env, pluginConfig }),
      writeResources: (args) =>
        plugin.writeResources({ ...args, ...env, pluginConfig }),
    };
  }
	\`\`\`  
`
}
