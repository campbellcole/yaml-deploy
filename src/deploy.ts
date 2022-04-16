#!/usr/bin/env node

import meow from "meow";
import fs from "fs";
import path from "path";
import prompt, { Properties } from "prompt";
import { parse, stringify } from "yaml";
import { exit } from "process";

const cli = meow(
  `
      Usage
        $ deploy.js [options]

      Options
        --pfix, -p        Set the prefix and postfix format (default: "%%" -> "%%name%%")
        --magic-num, -m   

      Examples
        $ foo unicorns --rainbow
        🌈 unicorns 🌈
`,
  {
    importMeta: import.meta,
    flags: {
      pfix: {
        default: "%%",
        alias: "p",
        type: "string",
      },
      magicNum: {
        default: -99999,
        alias: "m",
        type: "number",
      },
      template: {
        isRequired: true,
        alias: "t",
        type: "string",
      },
      deploymentName: {
        isRequired: true,
        alias: "n",
        type: "string",
      },
      deploymentCount: {
        isRequired: true,
        alias: "c",
        type: "number",
      },
      debug: {
        default: false,
        alias: "d",
        type: "boolean",
      },
      skipConstants: {
        default: false,
        alias: "s",
        type: "boolean",
      },
    },
  }
);

if (cli.flags.deploymentCount < 1) {
  console.error(`Invalid deployment count: ${cli.flags.deploymentCount}`);
  console.error(`Deployment count must be larger than 0.`);
  exit(1);
}

const debug = cli.flags.debug
  ? (message?: any, ...optionalParams: any[]) =>
      console.log(message, ...optionalParams)
  : () => {};
const head = (title: string) => {
  console.log(`\n\u250c  ${" ".repeat(title.length)}  \u2510`);
  console.log(`   ${title}   `);
  console.log(`\u2514  ${" ".repeat(title.length)}  \u2518\n`);
};
const msg = (str: string) => console.log(`\u25ba  ${str}`);

const isPlaceholder = (str: string) =>
  str.startsWith(cli.flags.pfix) && str.endsWith(cli.flags.pfix);

prompt.message = "";
prompt.delimiter = "";

const userPrompt = async (
  name: string,
  type: "string" | "number",
  required = false
): Promise<string> => {
  const properties: Properties = {};
  properties[name] = {
    description: `Enter a value for ${name}: `,
    type,
    required,
  };
  const userVal = (
    await prompt.get({
      properties,
    })
  )[name];
  return typeof userVal === "string" ? userVal : "";
};

async function promptPlaceholders(root: any, remove = false) {
  const placeholders: any = {};
  for (const key in root) {
    const o = root[key];
    const t = typeof o;
    if (t === "string") {
      const userVal = await userPrompt(o.replaceAll(cli.flags.pfix, ""), t);
      if (userVal !== undefined && userVal.length !== 0) {
        placeholders[key] = userVal;
        if (remove) root[key] = undefined;
      }
    } else if (t === "number") {
      const userVal = await userPrompt(key, t);
      debug(userVal, typeof userVal);
      //placeholders[key] = await userPrompt(key, t);
    } else if (t === "object") {
      placeholders[key] = await promptPlaceholders(o, remove);
    }
  }
  return placeholders;
}

function mergeObjects(truth: any, mods: any) {
  const merged = { ...truth };
  for (const key in merged) {
    const o = merged[key];
    if (typeof o === "object") {
      merged[key] = mergeObjects(o, mods[key]);
    } else {
      merged[key] = mods[key] !== undefined ? mods[key] : truth[key];
    }
  }
  return merged;
}

function traverseTemplate(template: any) {
  const prefixed: Partial<typeof template> = {};
  Object.keys(template).forEach((key) => {
    const o = template[key];
    if (typeof o === "string") {
      if (isPlaceholder(o)) {
        prefixed[key] = o;
      }
    } else if (typeof o === "number") {
      if (o === cli.flags.magicNum) {
        prefixed[key] = o;
      }
    } else if (typeof o === "object") {
      prefixed[key] = traverseTemplate(o);
    }
  });
  return prefixed;
}

async function main() {
  let _template;
  try {
    _template = fs.readFileSync(cli.flags.template);
  } catch (err) {
    console.error(`Unable to read template file: ${err}`);
    exit(1);
  }

  let template;
  try {
    template = parse(_template.toString());
  } catch (err) {
    console.error(`Unable to parse template YML: ${err}`);
  }

  debug("template:", template);

  const prefixed = traverseTemplate(template);

  debug("prefixed:", prefixed);

  prompt.start();

  if (!cli.flags.skipConstants) {
    head("CONSTANTS");
    msg("You will be prompted to enter a value for all placeholders.");
    msg(
      "Leave blank any placeholders which must be individually configured for each deployment.\n"
    );

    const constPlaceholders = await promptPlaceholders(prefixed, true);

    debug(constPlaceholders);

    const constTemplate = mergeObjects(template, constPlaceholders);
    const constTemplatePath = path.join(
      path.dirname(cli.flags.template),
      `${cli.flags.deploymentName}.const.yml`
    );

    debug(constTemplate);
    debug(`Writing const template to: ${constTemplatePath}`);

    fs.writeFileSync(constTemplatePath, stringify(constTemplate));

    console.log();
    msg(`Wrote constants to: ${constTemplatePath}`);
    msg(
      `To use this constants file, run 'deploy.js -t ${constTemplatePath} -s [options]`
    );

    template = constTemplate;
  }

  head("DEPLOYMENTS");
  msg("You will now be prompted to fill the remaining placeholders.");
  msg(
    `You will be prompted ${cli.flags.deploymentCount} times for each placeholder, once for each deployment.`
  );

  const deployments = [];
  for (var i = 0; i < cli.flags.deploymentCount; i++) {
    console.log();
    msg(`Deployment ${i + 1}`);
    const placeholders = await promptPlaceholders(prefixed); // const placeholders already removed

    debug(placeholders);

    const deployment = mergeObjects(template, placeholders);
    const deploymentPath = path.join(
      path.dirname(cli.flags.template),
      `${cli.flags.deploymentName}.${i + 1}.yml`
    );

    debug(deployment);
    debug(`Writing deployment to: ${deploymentPath}`);

    fs.writeFileSync(deploymentPath, stringify(deployment));
  }

  const deploymentsPath = path.join(
    path.dirname(cli.flags.template),
    `${cli.flags.deploymentName}.*.yml`
  );

  console.log();
  msg(`Wrote deployments to: ${deploymentsPath}`);
}

main().then(() => {
  console.log();
  msg("Goodbye.");
});
