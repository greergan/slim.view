import * as slim from "./slim_modules.ts";
interface compiled_view {
	"time":number;
	"view":string;
	"url":string;
};
export class SlimView {
	private namespace:string = "";
	private rawViews:Map<string, compiled_view> = new Map<string, compiled_view>();
	private compiledViews:Map<string, compiled_view> = new Map<string, compiled_view>();
	private viewDependencies:Map<string, Array<string>> = new Map<string, Array<string>>();
	constructor(namespace:string) {
		slim.utilities.is_valid_url(namespace) ? this.namespace = namespace : console.error("namspace must be a valid URL string");
		console.trace({message:"namespace",value:this.namespace});
	}
	public async getViewData(): Promise<slim.types.iKeyValueAny> {
		console.debug({message:'beginning'});
		const raw_views:compiled_view[] = [];
		const compiled_views:compiled_view[] = [];
		const dependent_views:object[] = [];
		this.rawViews.forEach((value, key) => raw_views.push(value));
		this.compiledViews.forEach((value, key) => compiled_views.push(value));
		this.viewDependencies.forEach((value, key) =>{ dependent_views.push({url: key, dependent_urls: value}); });
		console.trace(compiled_views);
		return {
			"namespace": this.namespace,
			"raw_views": raw_views,
			"compiled_views": compiled_views,
			"dependent_views": dependent_views
		}
	}
	private async coalesce(model:slim.types.iKeyValueAny, compiled_view:string):Promise<string> {
		let coalesce_view = compiled_view;
		// comments
		// statements
		// variable replacements
		const debugCommentReplacement1 = (match: string, replacement_string:string):void => {
			console.debug({message:"variable comment replacements with substitution",value:"capture group"}, match);
			console.debug({message:"variable comment replacements with substitution",value:"replaced with"}, replacement_string);
		};
		coalesce_view = coalesce_view.replace(/{#\s*({{.+}})\s*#}/gm, (match, data) => {
			const replacement_string:string = "<!-- " + data + " -->";
			debugCommentReplacement1(match, replacement_string);
			return replacement_string;
		});
		const debugCommentReplacement2 = (match: string, replacement_string:string):void => {
			console.debug({message:"variable comment replacements without substitution",value:"capture group"}, match);
			console.debug({message:"variable comment replacements without substitution",value:"replaced with"}, replacement_string);
		};
		coalesce_view = coalesce_view.replace(/({#{.+}#})/gm, (match, data) => {
			const replacement_string:string = "<!-- " + data + " -->";
			debugCommentReplacement2(match, replacement_string);
			return replacement_string;
		});
		const debugCommentReplacement3 = (match: string, replacement_string:string):void => {
			console.debug({message:"comment replacements with substitution",value:"capture group"}, match);
			console.debug({message:"comment replacements with substitution",value:"replaced with"}, replacement_string);
		};
		coalesce_view = coalesce_view.replace(/{#\s*({%.+%})\s*#}/gm, (match, data) => {
			const replacement_string:string = "<!-- " + data + " -->";
			debugCommentReplacement3(match, replacement_string);
			return replacement_string;
		});
		const debugCommentReplacement4 = (match: string, replacement_string:string):void => {
			console.debug({message:"comment replacements without substitution",value:"capture group"}, match);
			console.debug({message:"comment replacements without substitution",value:"replaced with"}, replacement_string);
		};
		coalesce_view = coalesce_view.replace(/{#%\s*.+\s*%#}/gm, (match) => {
			const replacement_string:string = "<!-- " + match + " -->";
			debugCommentReplacement4(match, replacement_string);
			return replacement_string;
		});
		const statement_expanssion_regex = /{%(.+?)%}$/gsm
		const statement_expanssion_promises:Array<Promise<string>> = [];
		const get_statement_replacement = (model:slim.types.iKeyValueAny, statement_string:string) => Promise.resolve(this.processStatement(model, statement_string));
	 	coalesce_view = coalesce_view.replace(statement_expanssion_regex, (match, statement):string => {
			statement_expanssion_promises.push(get_statement_replacement(model, statement));
			return match;
		});
		const debugStatementExpanssion = (match: string, replacement_string:string):void => {
			console.debug({message:"statement expanssion",value:"capture group"}, match);
			console.debug({message:"statement expanssion",value:"replaced with"}, replacement_string);
		};
		await Promise.all(statement_expanssion_promises).then(
			(statement_values) => coalesce_view = 
			coalesce_view.replace(statement_expanssion_regex, (match, statement_string) => {
				const replacement_string = statement_values.shift() ?? "";
				debugStatementExpanssion(match, replacement_string);
				return replacement_string;
		}));
		const variable_expanssion_regex = /\{\{([^}]+?)\}\}/gm;
		const variable_expanssion_promises:Array<Promise<string>> = [];
		const fetch_value:any = (property_string:string) => Promise.resolve(slim.utilities.get_node_value(model, property_string));
		coalesce_view = coalesce_view.replace(variable_expanssion_regex, (match, property_string):string => {
			variable_expanssion_promises.push(fetch_value(property_string));
			return match;
		});
		const debugVariableExpanssion = (match: string, replacement_string:string):void => {
			console.debug({message:"variable expanssion",value:"capture group"}, match);
			console.debug({message:"variable expanssion",value:"replaced with"}, replacement_string);
		};
		await Promise.all(variable_expanssion_promises).then(
			(property_values) => coalesce_view = 
			coalesce_view.replace(variable_expanssion_regex, (match, property_string) => {
				const replacement_string:string = property_values.shift() ?? "";
				debugVariableExpanssion(match, replacement_string);
				return replacement_string;
		}));
		console.trace({message:"coalesced", value:"file size"}, coalesce_view.length);
		return coalesce_view;
	}
	public async compile(url:string, parent_url:string|undefined=undefined):Promise<string> {
		const normalized_url:string = slim.utilities.is_valid_url(url) ? url : `${this.namespace}/${url}`;
		console.debug({message:"beginning",value:"with view_file"}, normalized_url, parent_url);
		if(parent_url && slim.utilities.is_valid_url(parent_url)) {
			if(this.viewDependencies.has(normalized_url)) {
				if(!this.viewDependencies.get(normalized_url)?.includes(parent_url)) {
					this.viewDependencies.get(normalized_url)?.push(parent_url);
				}
			}
			else {
				this.viewDependencies.set(normalized_url, [parent_url]);
			}
		}
		if(this.compiledViews.has(normalized_url)) {
			const compiled_view:string = this.compiledViews.get(normalized_url)?.view ?? "";
			console.debug({message:"returned",value:"pre-compiled view, length"}, compiled_view.length, normalized_url);
			return compiled_view;
		}
		if(!this.rawViews.has(normalized_url)) {
			console.debug({message:"fetching",value:"template file"}, normalized_url);
			const file_contents:string = await slim.utilities.get_file_contents(normalized_url) as string;
			this.rawViews.set(normalized_url, {time:new Date().getTime(), view:file_contents, url:normalized_url});
		}
		let view_string = this.rawViews.get(normalized_url)?.view!;
		const include_regex =/<\s*include\s+view\s*=\s*"\s*([a-z0-9-_/?&=.:]+?)\s*"\s*\/?\s*>/gmi;
		const fetch_file = (file:string) => Promise.resolve(this.compile(file, normalized_url));
		const promises:Array<Promise<string>> = [];
		view_string.replace(include_regex, (match:string, url:string): string => {
			const url_string:string = slim.utilities.is_valid_url(url) ? url : `${this.namespace}/${url}`;
			promises.push(fetch_file(url_string));
			return match;
		});
		await Promise.all(promises).then((results) => view_string = view_string.replace(include_regex, () => results.shift() ?? ""));
		this.compiledViews.set(normalized_url, {time:new Date().getTime(), view: view_string, url:normalized_url});
		console.trace({message:"compiled",value:"view_string length"}, view_string.length, normalized_url);
		return view_string;
	}
	public async recompile(url:string):Promise<string[]> {
		const normalized_url:string = await slim.utilities.get_normalized_url(url);
		console.debug({message: "beginning with", value:"normalized_url"}, normalized_url)
		if(this.rawViews.has(normalized_url)) {
			this.rawViews.delete(normalized_url);
		}
		if(this.compiledViews.has(normalized_url)) {
			this.compiledViews.delete(normalized_url);
		}
		const dependent_files:string[] = [];
		if(this.viewDependencies.has(normalized_url)) {
			for await (const dependency of this.viewDependencies.get(normalized_url)!) {
				if(this.rawViews.has(dependency)) {
					this.rawViews.delete(dependency);
				}
				if(this.compiledViews.has(dependency)) {
					this.compiledViews.delete(dependency);
				}
				await this.recompile(dependency);
				dependent_files.push(dependency);
			}
		}
		else {
			await this.compile(normalized_url);
			dependent_files.push(normalized_url);
		}
		console.trace({message:"url",value:normalized_url});
		return dependent_files;
	}
	public async render(model:slim.types.iKeyValueAny, html_ref:string):Promise<string> {
		const view_string:string = html_ref.match(/\s|{|}/) ? html_ref : await this.compile(html_ref);
		const rendered_view:string = await this.coalesce(model, view_string);
		console.trace({message:"rendered", value:"view"}, rendered_view.length, view_string);
		return rendered_view;
	}
	private parseStatement(statement_string:string):{view_string:string,filter:slim.filter.SlimFilter} {
		// what is left over after this next block is considered an HTML fragement to be used as the view_string
		// if there is not a valid view property found
		let temp_string = statement_string;
		temp_string = temp_string.replace(/(\s*with|foreach\s)/, '');
		temp_string = temp_string.replace(/(\s*model\s*=\s*"*\s*[\w\d\.]+\[*\d*\]*\s*"*\s*)/, '');
		temp_string = temp_string.replace(/(filter\s*=\s*"*\s*[\w_]+\(.+\)"*\s*)/, '');
		temp_string = temp_string.replace(/(view\s*=\s*"*\s*[^\s"][\w\d.\/:]+\s*"*\s*)/, '');
		console.debug({message:"beginning",value:"statement"}, statement_string);
		const predicate_match:Array<string> = statement_string.match(/\s*(with|foreach)\s/) ?? [];
		console.debug({message:"beginning",value:"predicate_match[0]"}, predicate_match[1]);
		if(predicate_match.length != 2) {
			throw new Error(`unknown statement => ${statement_string}`);
		}
		const model_match:Array<string> = statement_string.match(/\s+(model)\s*=\s*"*\s*([\w\d\.]+\[*\d*\]*)\s*"*/i) ?? [];
		console.debug({message:"beginning",value:"model_match[2]"}, model_match[2]);
		if(model_match.length != 3) {
			throw new Error(`model keyword not found in ${statement_string}`);
		}
		const filter_match:Array<string> = statement_string.match(/(filter)\s*=\s*"*\s*([\w_]+\(.+\))"*/i) ?? [];
		console.debug({message:"beginning",value:"filter_match[0]"}, filter_match[1]);
		if(filter_match.length > 0 && filter_match.length < 3) {
			throw new Error(`corrupt filter element found in ${statement_string}`);
		}
		const view_match:Array<string> = statement_string.match(/(view)\s*=\s*"*\s*([^\s"][\w\d.\/:]+)\s*"*\s*/i) ?? [];
		console.debug({message:"beginning",value:"view_match[0]"}, view_match[1]);
		if(view_match.length > 0 && view_match.length < 3) {
			throw new Error(`corrupt view element found in ${statement_string}`);
		}
		const view_string = view_match.length == 3 ? slim.utilities.is_valid_url(view_match[2]) ? view_match[2] : `${this.namespace}/${view_match[2]}` : temp_string;
		const filter = new slim.filter.SlimFilter({ filter_string: filter_match[2] ?? "", model_string: model_match[2] ?? ""});
		console.trace({message:"statement",value:"parsed"});
		return {view_string:view_string,filter};
	}
	private async processStatement(model:slim.types.iKeyValueAny, statement_string:string):Promise<string> {
		console.debug({message:"beginning",value:"statement"}, statement_string);
		const results:slim.types.iKeyValueAny = this.parseStatement(statement_string.trim());
		await results.filter.run(model);
		const nested_statement_match:string[] = results.view_string.match(/{%(.+)%}/gms) ?? [];
		let nested_view:string = "";
		let coalesced_view = "";
		if(nested_statement_match.length > 0) {
			console.debug({message:"nested",value:"results.view_string"}, results.view_string);
			console.debug({message:"nested",value:"nested_statement"}, nested_statement_match);
			const parent_model:slim.types.iKeyValueAny = await slim.utilities.get_node_value(model, results.filter.model) as slim.types.iKeyValueAny;
			console.debug({message:"nested",value:"nested_statement"}, nested_statement_match[0]);
			const nested_results:slim.types.iKeyValueAny = this.parseStatement(nested_statement_match[0].replace('{%', '').replace('%}', '').trim());
			console.debug({message:"nested_results"}, nested_results);
			const nested_model:slim.types.iKeyValueAny[] = await slim.utilities.get_node_value(parent_model, nested_results.filter.model) as slim.types.iKeyValueAny[] ?? [];
			for await(const object_model of nested_model) {
				nested_view += await this.coalesce(object_model, nested_results.view_string);
			}
			console.debug({message:"nested_view"}, nested_view);
			console.debug({message:"processing",value:"results.view_string"}, results.view_string);
			coalesced_view = results.view_string.replace(/({%.+%})/gms, nested_view);
			console.debug({message:"processed nested statement",value:"coalesced_view"}, coalesced_view);
		}
		else {
			console.debug({message:"processing",value:"results.filter.getViewModels()"}, results.filter.getViewModels());
			console.debug({message:"processing",value:"results.view_string"}, results.view_string);
			const view_string:string = results.view_string.match(/\s|{|}/) ? results.view_string : await this.compile(results.view_string);
			for await(const property_model of results.filter.getViewModels()) {
				coalesced_view += await this.coalesce(property_model, view_string);
			}
		}
		console.trace({message:"statement",value:"coalesced"},coalesced_view.length);
		return coalesced_view;
	}
}