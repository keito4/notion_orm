import { existsSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { Client } from "@notionhq/client";
import { logger } from "../utils/logger";
import { t } from "../utils/i18n";
import * as readline from "readline";

interface DatabaseInfo {
  id: string;
  title: string;
  url: string;
  properties: Record<string, any>;
}

interface InitOptions {
  interactive?: boolean;
  apiKey?: string;
  outputDir?: string;
}

export class InitCommand {
  private rl: readline.Interface;
  private apiKey: string = "";
  private databases: DatabaseInfo[] = [];
  private selectedDatabases: DatabaseInfo[] = [];
  private outputDir: string = "./";

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private async promptPassword(question: string): Promise<string> {
    return new Promise((resolve) => {
      const stdin = process.stdin;
      const stdout = process.stdout;

      stdout.write(question);

      const onData = (char: Buffer) => {
        const str = char.toString();
        switch (str) {
          case "\n":
          case "\r":
          case "\u0004":
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener("data", onData);
            stdout.write("\n");
            resolve((stdin as any).password || "");
            break;
          default:
            stdout.write("*");
            (stdin as any).password = ((stdin as any).password || "") + str;
            break;
        }
      };

      stdin.resume();
      stdin.setRawMode(true);
      stdin.on("data", onData);
    });
  }

  private printBanner() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🚀 Notion ORM Setup Wizard                 ║
╚═══════════════════════════════════════════════════════════════╝

${t('init.welcome')}
${t('init.description')}
`);
  }

  private printStep(step: number, title: string) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📌 ${t('init.step')} ${step}: ${title}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  async execute(_options: InitOptions = {}): Promise<void> {
    try {
      this.printBanner();

      // Step 1: API Key setup
      await this.setupApiKey();

      // Step 2: Test connection and fetch databases
      await this.fetchDatabases();

      // Step 3: Select databases
      await this.selectDatabases();

      // Step 4: Generate schema
      await this.generateSchema();

      // Step 5: Create .env file
      await this.createEnvFile();

      // Step 6: Setup complete
      this.printSuccess();

      this.rl.close();
    } catch (error) {
      logger.error(t('init.error'), error);
      this.rl.close();
      throw error;
    }
  }

  private async setupApiKey(): Promise<void> {
    this.printStep(1, t('init.api_key_setup'));

    console.log(t('init.api_key_instructions'));
    console.log(`\n1. ${t('init.visit_integrations')} https://www.notion.so/my-integrations`);
    console.log(`2. ${t('init.create_integration')}`);
    console.log(`3. ${t('init.enable_capabilities')}`);
    console.log(`4. ${t('init.copy_token')}\n`);

    // Check if API key exists in environment
    const existingKey = process.env.NOTION_API_KEY;
    if (existingKey) {
      const useExisting = await this.prompt(
        `${t('init.existing_key_found')} ${t('init.use_existing')} (Y/n): `
      );
      if (useExisting.toLowerCase() !== "n") {
        this.apiKey = existingKey;
        return;
      }
    }

    // Prompt for API key
    while (!this.apiKey) {
      const key = await this.promptPassword(`${t('init.enter_api_key')}: `);
      if (!key.startsWith("secret_")) {
        logger.warn(t('init.invalid_api_key'));
        continue;
      }
      this.apiKey = key;
    }
  }

  private async fetchDatabases(): Promise<void> {
    this.printStep(2, t('init.fetching_databases'));

    const spinner = this.createSpinner(t('init.connecting_notion'));

    try {
      const client = new Client({ auth: this.apiKey });

      // Test connection
      await client.users.list({ page_size: 1 });
      this.stopSpinner(spinner, "✓");

      const fetchSpinner = this.createSpinner(t('init.fetching_databases_progress'));

      // Search for all databases
      const response = await client.search({
        filter: { value: "database", property: "object" },
        page_size: 100,
      });

      this.databases = response.results
        .filter((result: any) => result.object === "database")
        .map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || "Untitled Database",
          url: db.url,
          properties: db.properties || {},
        }));

      this.stopSpinner(fetchSpinner, "✓");

      console.log(`\n${t('init.found_databases', { count: this.databases.length })}`);
    } catch (error: any) {
      this.stopSpinner(spinner, "✗");
      if (error.code === "unauthorized") {
        throw new Error(t('init.unauthorized_error'));
      }
      throw error;
    }
  }

  private async selectDatabases(): Promise<void> {
    this.printStep(3, t('init.select_databases'));

    if (this.databases.length === 0) {
      logger.warn(t('init.no_databases_found'));
      const createNew = await this.prompt(t('init.create_sample_schema') + " (Y/n): ");
      if (createNew.toLowerCase() !== "n") {
        this.selectedDatabases = [];
      }
      return;
    }

    console.log(t('init.available_databases') + ":\n");

    // Display databases with numbers
    this.databases.forEach((db, index) => {
      console.log(`  ${index + 1}. ${db.title}`);
      console.log(`     ${t('init.id')}: ${db.id}`);
      console.log(`     ${t('init.properties')}: ${Object.keys(db.properties).length}`);
      console.log();
    });

    const selection = await this.prompt(
      t('init.select_databases_prompt') + " (e.g., 1,3,5 or 'all'): "
    );

    if (selection.toLowerCase() === "all") {
      this.selectedDatabases = this.databases;
    } else {
      const indices = selection
        .split(",")
        .map((s) => parseInt(s.trim()) - 1)
        .filter((i) => i >= 0 && i < this.databases.length);
      this.selectedDatabases = indices.map((i) => this.databases[i]);
    }

    console.log(`\n${t('init.selected_count', { count: this.selectedDatabases.length })}`);
  }

  private async generateSchema(): Promise<void> {
    this.printStep(4, t('init.generating_schema'));

    const schemaPath = resolve(this.outputDir, "schema.prisma");

    // Check if schema exists
    if (existsSync(schemaPath)) {
      const overwrite = await this.prompt(
        t('init.schema_exists') + " " + t('init.overwrite') + " (y/N): "
      );
      if (overwrite.toLowerCase() !== "y") {
        logger.info(t('init.skip_schema_generation'));
        return;
      }
    }

    const schemaContent = this.buildSchemaContent();
    writeFileSync(schemaPath, schemaContent);

    logger.success(t('init.schema_generated', { path: schemaPath }));
  }

  private buildSchemaContent(): string {
    let content = `generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

`;

    if (this.selectedDatabases.length === 0) {
      // Generate sample schema
      content += this.generateSampleSchema();
    } else {
      // Generate schema from selected databases
      this.selectedDatabases.forEach((db) => {
        content += this.generateModelFromDatabase(db);
      });
    }

    return content;
  }

  private generateSampleSchema(): string {
    return `// Sample schema - Replace with your actual Notion database IDs
model Task @notionDatabase("your-task-database-id") {
  title       String    @title @map("Title")
  description String?   @richText @map("Description")
  status      String    @select @map("Status")
  priority    String    @select @map("Priority")
  dueDate     DateTime? @date @map("Due Date")
  completed   Boolean   @checkbox @map("Completed")
  assignee    Json?     @people @map("Assignee")
  tags        String[]  @multiSelect @map("Tags")
  createdAt   DateTime? @createdTime @map("Created At")
  updatedAt   DateTime? @lastEditedTime @map("Updated At")
}

model Project @notionDatabase("your-project-database-id") {
  name        String    @title @map("Name")
  description String?   @richText @map("Description")
  status      String    @select @map("Status")
  startDate   DateTime? @date @map("Start Date")
  endDate     DateTime? @date @map("End Date")
  team        Json[]    @people @map("Team Members")
  budget      Float?    @number @map("Budget")
  progress    Float?    @number @map("Progress %")
  tasks       Task[]    @relation
}
`;
  }

  private generateModelFromDatabase(db: DatabaseInfo): string {
    const modelName = this.toPascalCase(db.title);
    let model = `model ${modelName} @notionDatabase("${db.id}") {\n`;

    // Add comment with database info
    model = `// Database: ${db.title}\n// ID: ${db.id}\n${model}`;

    // Map Notion properties to Prisma fields
    Object.entries(db.properties).forEach(([propName, propConfig]: [string, any]) => {
      const fieldName = this.toCamelCase(propName);
      const fieldLine = this.mapPropertyToField(fieldName, propName, propConfig);
      if (fieldLine) {
        model += fieldLine;
      }
    });

    model += "}\n\n";
    return model;
  }

  private mapPropertyToField(fieldName: string, propName: string, config: any): string {
    const typeMap: Record<string, { type: string; decorator: string }> = {
      title: { type: "String", decorator: "@title" },
      rich_text: { type: "String?", decorator: "@richText" },
      number: { type: "Float?", decorator: "@number" },
      select: { type: "String?", decorator: "@select" },
      multi_select: { type: "String[]", decorator: "@multiSelect" },
      date: { type: "DateTime?", decorator: "@date" },
      checkbox: { type: "Boolean", decorator: "@checkbox" },
      people: { type: "Json[]", decorator: "@people" },
      files: { type: "String[]", decorator: "@files" },
      email: { type: "String?", decorator: "@email" },
      phone_number: { type: "String?", decorator: "@phoneNumber" },
      url: { type: "String?", decorator: "@url" },
      created_time: { type: "DateTime?", decorator: "@createdTime" },
      last_edited_time: { type: "DateTime?", decorator: "@lastEditedTime" },
      created_by: { type: "Json?", decorator: "@createdBy" },
      last_edited_by: { type: "Json?", decorator: "@lastEditedBy" },
    };

    const mapping = typeMap[config.type];
    if (!mapping) {
      return `  // ${fieldName} - Unsupported type: ${config.type}\n`;
    }

    // Ensure proper spacing
    const padding = " ".repeat(Math.max(1, 14 - fieldName.length));
    return `  ${fieldName}${padding}${mapping.type}    ${mapping.decorator} @map("${propName}")\n`;
  }

  private async createEnvFile(): Promise<void> {
    this.printStep(5, t('init.creating_env_file'));

    const envPath = resolve(this.outputDir, ".env");
    const envExamplePath = resolve(this.outputDir, ".env.example");

    // Create .env content
    let envContent = `# Notion API Configuration
NOTION_API_KEY=${this.apiKey}

# Database IDs
`;

    this.selectedDatabases.forEach((db) => {
      const envName = this.toSnakeCase(db.title).toUpperCase() + "_DATABASE_ID";
      envContent += `${envName}=${db.id}\n`;
    });

    // Check if .env exists
    if (existsSync(envPath)) {
      const overwrite = await this.prompt(
        t('init.env_exists') + " " + t('init.overwrite') + " (y/N): "
      );
      if (overwrite.toLowerCase() !== "y") {
        logger.info(t('init.skip_env_creation'));
        return;
      }
    }

    // Write .env file
    writeFileSync(envPath, envContent);
    logger.success(t('init.env_created', { path: envPath }));

    // Create .env.example
    const exampleContent = envContent.replace(this.apiKey, "your_api_key_here");
    writeFileSync(envExamplePath, exampleContent);

    // Update .gitignore
    await this.updateGitignore();
  }

  private async updateGitignore(): Promise<void> {
    const gitignorePath = resolve(this.outputDir, ".gitignore");
    const patterns = [".env", ".env.local", ".env.*.local", "generated/"];

    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, "utf-8");
      const lines = content.split("\n");
      const missingPatterns = patterns.filter((p) => !lines.includes(p));

      if (missingPatterns.length > 0) {
        const updatedContent = content + "\n" + missingPatterns.join("\n") + "\n";
        writeFileSync(gitignorePath, updatedContent);
        logger.info(t('init.gitignore_updated'));
      }
    } else {
      writeFileSync(gitignorePath, patterns.join("\n") + "\n");
      logger.info(t('init.gitignore_created'));
    }
  }

  private printSuccess(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ✅ Setup Complete!                         ║
╚═══════════════════════════════════════════════════════════════╝

${t('init.setup_complete_message')}

${t('init.next_steps')}:

  1. ${t('init.share_databases')}
     ${t('init.share_instructions')}

  2. ${t('init.generate_types')}
     $ notion-orm generate

  3. ${t('init.start_coding')}
     ${t('init.import_client')}

${t('init.learn_more')}:
  📖 ${t('init.documentation')}: https://github.com/your-org/notion-orm
  🚀 ${t('init.examples')}: ./docs/examples/
  💬 ${t('init.support')}: https://github.com/your-org/notion-orm/issues

${t('init.happy_coding')} 🎉
`);
  }

  // Utility methods
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
      .replace(/^./, (char) => char.toUpperCase());
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .replace(/[-\s]+/g, "_")
      .toLowerCase()
      .replace(/^_/, "");
  }

  private createSpinner(message: string): ReturnType<typeof setInterval> {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    process.stdout.write(`${message} ${frames[0]}`);
    return setInterval(() => {
      process.stdout.write(`\r${message} ${frames[++i % frames.length]}`);
    }, 80);
  }

  private stopSpinner(spinner: ReturnType<typeof setInterval>, symbol: string): void {
    clearInterval(spinner);
    process.stdout.write(`\r${symbol}\n`);
  }
}