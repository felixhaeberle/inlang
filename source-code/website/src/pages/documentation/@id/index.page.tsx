import fs from "node:fs/promises";
import { parseValidateAndRender } from "@src/services/markdoc/parseValidateAndRender.js";
import { Header } from "./Header.jsx";
import { Navigation } from "./Navigation.jsx";
import { Footer } from "./Footer.jsx";
import { sections } from "./tableOfContent.jsx";
import type { PageContext, PageHead } from "@src/renderer/types.js";

export const Head: PageHead = () => {
	return {
		title: "Documentation",
		description: "Documentation",
	};
};

export async function onBeforeRender(pageContext: PageContext) {
	try {
		const text = await fs.readFile(
			`../../documentation/${pageContext.routeParams.id}.md`,
			"utf8"
		);

		const markdown = parseValidateAndRender(text);
		return {
			pageContext: {
				pageProps: {
					markdown,
				},
			},
		};
	} catch (error) {
		console.error(error);
		return {
			pageContext: {
				pageProps: {
					markdown: undefined,
				},
			},
		};
	}
}

type PageProps = {
	markdown?: string;
};

export function Page(props: PageProps) {
	return (
		<>
			<div class="mx-auto max-w-screen-2xl ">
				<Header />
				<div class=" flex ">
					<Navigation sections={sections} />

					{props.markdown ? (
						<div class=" w-full prose" innerHTML={props.markdown}></div>
					) : (
						<p>schade</p>
					)}
				</div>
				{/* <Footer /> */}
			</div>
		</>
	);
}
