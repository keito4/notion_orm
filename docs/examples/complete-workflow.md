# Complete Workflow Examples / 完全なワークフロー例

[English](#english) | [日本語](#japanese)

## English

### Example 1: Project Management System

This example demonstrates a complete project management workflow using Notion ORM with complex relations.

#### Schema Definition

```prisma
generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

model User @notionDatabase("user-database-id") {
  name          String    @title @map("Name")
  email         String    @map("Email") @email
  role          String    @map("Role") @select
  active        Boolean   @map("Active") @checkbox
  joinedDate    DateTime? @map("Joined Date") @date
  department    String    @map("Department") @select
  projects      Project[] @relation
  assignedTasks Task[]    @relation
}

model Project @notionDatabase("project-database-id") {
  name          String    @title @map("Name")
  description   String?   @map("Description") @richText
  status        String    @map("Status") @select
  priority      String    @map("Priority") @select
  startDate     DateTime? @map("Start Date") @date
  endDate       DateTime? @map("End Date") @date
  teamMembers   User[]    @relation
  tasks         Task[]    @relation
  tags          String[]  @map("Tags") @multiSelect
  budget        Float?    @map("Budget") @number
  progress      Float?    @map("Progress") @number
}

model Task @notionDatabase("task-database-id") {
  title         String    @title @map("Title")
  description   String?   @map("Description") @richText
  status        String    @map("Status") @select
  priority      String    @map("Priority") @select
  assignee      User[]    @relation
  project       Project[] @relation
  dueDate       DateTime? @map("Due Date") @date
  completed     Boolean   @map("Completed") @checkbox
  tags          String[]  @map("Tags") @multiSelect
  estimatedTime Float?    @map("Estimated Hours") @number
  actualTime    Float?    @map("Actual Hours") @number
}
```

#### Complete Implementation

```typescript
// project-manager.ts
import { NotionOrmClient } from './generated/client';
import { User, Project, Task } from './generated/types';

export class ProjectManager {
  private client: NotionOrmClient;

  constructor(apiKey: string) {
    this.client = new NotionOrmClient(apiKey);
  }

  // Create a new project with team members
  async createProject(projectData: {
    name: string;
    description?: string;
    status: string;
    priority: string;
    startDate?: string;
    endDate?: string;
    teamMemberEmails: string[];
    budget?: number;
  }): Promise<Project> {
    // First, find team members by email
    const teamMembers: User[] = [];
    for (const email of projectData.teamMemberEmails) {
      const users = await this.client.queryUser()
        .where('email', 'equals', email)
        .execute();
      
      if (users.length > 0) {
        teamMembers.push(users[0]);
      }
    }

    // Create the project
    const project = await this.client.queryProject().createPage({
      name: projectData.name,
      description: projectData.description,
      status: projectData.status,
      priority: projectData.priority,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      budget: projectData.budget,
      progress: 0,
      // Note: Relations need to be set separately in Notion
      teamMembers: teamMembers.map(member => ({ id: member.id }))
    });

    console.log(`✅ Created project: ${project.name} (${project.id})`);
    return project;
  }

  // Assign task to project and user
  async createTask(taskData: {
    title: string;
    description?: string;
    status: string;
    priority: string;
    projectId: string;
    assigneeEmail: string;
    dueDate?: string;
    estimatedTime?: number;
  }): Promise<Task> {
    // Find assignee
    const assignees = await this.client.queryUser()
      .where('email', 'equals', taskData.assigneeEmail)
      .execute();

    if (assignees.length === 0) {
      throw new Error(`User with email ${taskData.assigneeEmail} not found`);
    }

    // Find project
    const projects = await this.client.queryProject()
      .where('id', 'equals', taskData.projectId)
      .execute();

    if (projects.length === 0) {
      throw new Error(`Project with id ${taskData.projectId} not found`);
    }

    // Create task
    const task = await this.client.queryTask().createPage({
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      completed: false,
      estimatedTime: taskData.estimatedTime,
      assignee: [{ id: assignees[0].id }],
      project: [{ id: taskData.projectId }]
    });

    console.log(`✅ Created task: ${task.title} (${task.id})`);
    return task;
  }

  // Get project dashboard with all related data
  async getProjectDashboard(projectId: string) {
    // Get project details
    const projects = await this.client.queryProject()
      .where('id', 'equals', projectId)
      .execute();

    if (projects.length === 0) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    const project = projects[0];

    // Get all project tasks
    const tasks = await this.client.queryTask()
      .whereRelation('project', 'contains', projectId)
      .orderBy('dueDate', 'ascending')
      .execute();

    // Get team members
    const teamMembers = await this.client.queryUser()
      .whereRelation('projects', 'contains', projectId)
      .execute();

    // Calculate project statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const overdueTasks = tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && !task.completed
    ).length;
    
    const totalEstimatedHours = tasks.reduce((sum, task) => 
      sum + (task.estimatedTime || 0), 0
    );
    const totalActualHours = tasks.reduce((sum, task) => 
      sum + (task.actualTime || 0), 0
    );

    return {
      project,
      tasks,
      teamMembers,
      statistics: {
        totalTasks,
        completedTasks,
        overdueTasks,
        progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        totalEstimatedHours,
        totalActualHours,
        timeVariance: totalActualHours - totalEstimatedHours
      }
    };
  }

  // Update task status and log time
  async updateTaskProgress(taskId: string, updates: {
    status?: string;
    completed?: boolean;
    actualTime?: number;
    notes?: string;
  }): Promise<Task> {
    // Note: This is a simplified example. In a real implementation,
    // you would need to use Notion's page update API
    console.log(`Updating task ${taskId} with:`, updates);
    
    // For demonstration, we'll show how you might fetch and display the update
    const tasks = await this.client.queryTask()
      .where('id', 'equals', taskId)
      .execute();

    if (tasks.length === 0) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    console.log(`✅ Updated task: ${tasks[0].title}`);
    return tasks[0];
  }

  // Generate project report
  async generateProjectReport(projectId: string): Promise<string> {
    const dashboard = await this.getProjectDashboard(projectId);
    
    const report = `
# Project Report: ${dashboard.project.name}

## Overview
- **Status**: ${dashboard.project.status}
- **Priority**: ${dashboard.project.priority}
- **Start Date**: ${dashboard.project.startDate || 'Not set'}
- **End Date**: ${dashboard.project.endDate || 'Not set'}
- **Budget**: $${dashboard.project.budget || 'Not set'}

## Progress
- **Total Tasks**: ${dashboard.statistics.totalTasks}
- **Completed**: ${dashboard.statistics.completedTasks}
- **Progress**: ${dashboard.statistics.progressPercentage.toFixed(1)}%
- **Overdue Tasks**: ${dashboard.statistics.overdueTasks}

## Time Tracking
- **Estimated Hours**: ${dashboard.statistics.totalEstimatedHours}
- **Actual Hours**: ${dashboard.statistics.totalActualHours}
- **Time Variance**: ${dashboard.statistics.timeVariance > 0 ? '+' : ''}${dashboard.statistics.timeVariance}h

## Team Members
${dashboard.teamMembers.map(member => `- ${member.name} (${member.role})`).join('\n')}

## Recent Tasks
${dashboard.tasks.slice(0, 5).map(task => 
  `- [${task.completed ? 'x' : ' '}] ${task.title} (${task.status}) - Due: ${task.dueDate || 'No date'}`
).join('\n')}
`;

    return report;
  }
}

// Usage example
async function main() {
  const manager = new ProjectManager(process.env.NOTION_API_KEY!);

  try {
    // Create a new project
    const project = await manager.createProject({
      name: 'Website Redesign',
      description: 'Complete redesign of company website',
      status: 'In Progress',
      priority: 'High',
      startDate: '2024-01-15',
      endDate: '2024-03-15',
      teamMemberEmails: ['john@company.com', 'jane@company.com'],
      budget: 50000
    });

    // Create tasks for the project
    await manager.createTask({
      title: 'Design Homepage Mockup',
      description: 'Create wireframes and visual designs for the new homepage',
      status: 'To Do',
      priority: 'High',
      projectId: project.id,
      assigneeEmail: 'jane@company.com',
      dueDate: '2024-01-25',
      estimatedTime: 16
    });

    await manager.createTask({
      title: 'Implement Navigation Component',
      description: 'Build responsive navigation component in React',
      status: 'To Do',
      priority: 'Medium',
      projectId: project.id,
      assigneeEmail: 'john@company.com',
      dueDate: '2024-02-01',
      estimatedTime: 12
    });

    // Get project dashboard
    const dashboard = await manager.getProjectDashboard(project.id);
    console.log('📊 Project Dashboard:', dashboard.statistics);

    // Generate and display report
    const report = await manager.generateProjectReport(project.id);
    console.log(report);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main();
}
```

### Example 2: Content Management System

```typescript
// content-manager.ts
import { NotionOrmClient } from './generated/client';

export class ContentManager {
  private client: NotionOrmClient;

  constructor(apiKey: string) {
    this.client = new NotionOrmClient(apiKey);
  }

  // Create content with category and tags
  async createArticle(articleData: {
    title: string;
    content: string;
    type: string;
    status: string;
    authorEmail: string;
    categoryName: string;
    tags: string[];
  }) {
    // Find or create category
    let categories = await this.client.queryCategory()
      .where('name', 'equals', articleData.categoryName)
      .execute();

    let category;
    if (categories.length === 0) {
      category = await this.client.queryCategory().createPage({
        name: articleData.categoryName,
        description: `Category for ${articleData.categoryName} content`,
        order: 1
      });
    } else {
      category = categories[0];
    }

    // Find author
    const authors = await this.client.queryUser()
      .where('email', 'equals', articleData.authorEmail)
      .execute();

    if (authors.length === 0) {
      throw new Error(`Author with email ${articleData.authorEmail} not found`);
    }

    // Create article
    const article = await this.client.queryDocument().createPage({
      title: articleData.title,
      content: articleData.content,
      type: articleData.type,
      status: articleData.status,
      tags: articleData.tags,
      author: [{ id: authors[0].id }],
      category: [{ id: category.id }]
    });

    console.log(`✅ Created article: ${article.title}`);
    return article;
  }

  // Get content by category with pagination
  async getContentByCategory(categoryName: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    
    const documents = await this.client.queryDocument()
      .whereRelation('category', 'contains', categoryName)
      .orderBy('createdAt', 'descending')
      .limit(limit)
      // Note: Notion API doesn't support offset directly, this is conceptual
      .execute();

    return {
      documents: documents.slice(offset, offset + limit),
      page,
      limit,
      total: documents.length,
      hasMore: documents.length > offset + limit
    };
  }

  // Full-text search across documents
  async searchContent(query: string, filters?: {
    type?: string;
    status?: string;
    tags?: string[];
  }) {
    let queryBuilder = this.client.queryDocument();

    // Apply filters
    if (filters?.type) {
      queryBuilder = queryBuilder.where('type', 'equals', filters.type);
    }
    if (filters?.status) {
      queryBuilder = queryBuilder.where('status', 'equals', filters.status);
    }

    const results = await queryBuilder
      .orderBy('updatedAt', 'descending')
      .execute();

    // Client-side filtering for content search (Notion API has limited search)
    const filteredResults = results.filter(doc => 
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      (doc.content && doc.content.toLowerCase().includes(query.toLowerCase()))
    );

    return filteredResults;
  }
}
```

## Japanese

### 例1: プロジェクト管理システム

この例では、複雑なリレーションを使用したNotion ORMによる完全なプロジェクト管理ワークフローを示します。

#### スキーマ定義

```prisma
generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

model User @notionDatabase("user-database-id") {
  name          String    @title @map("名前")
  email         String    @map("メールアドレス") @email
  role          String    @map("役職") @select
  active        Boolean   @map("アクティブ") @checkbox
  joinedDate    DateTime? @map("入社日") @date
  department    String    @map("部署") @select
  projects      Project[] @relation
  assignedTasks Task[]    @relation
}

model Project @notionDatabase("project-database-id") {
  name          String    @title @map("プロジェクト名")
  description   String?   @map("説明") @richText
  status        String    @map("ステータス") @select
  priority      String    @map("優先度") @select
  startDate     DateTime? @map("開始日") @date
  endDate       DateTime? @map("終了日") @date
  teamMembers   User[]    @relation
  tasks         Task[]    @relation
  tags          String[]  @map("タグ") @multiSelect
  budget        Float?    @map("予算") @number
  progress      Float?    @map("進捗") @number
}

model Task @notionDatabase("task-database-id") {
  title         String    @title @map("タスク名")
  description   String?   @map("詳細") @richText
  status        String    @map("ステータス") @select
  priority      String    @map("優先度") @select
  assignee      User[]    @relation
  project       Project[] @relation
  dueDate       DateTime? @map("期限") @date
  completed     Boolean   @map("完了") @checkbox
  tags          String[]  @map("タグ") @multiSelect
  estimatedTime Float?    @map("予想工数") @number
  actualTime    Float?    @map("実工数") @number
}
```

#### 完全な実装例

```typescript
// プロジェクト管理の使用例
async function main() {
  const manager = new ProjectManager(process.env.NOTION_API_KEY!);

  try {
    // 新しいプロジェクトを作成
    const project = await manager.createProject({
      name: 'ウェブサイトリニューアル',
      description: '会社ウェブサイトの完全リニューアル',
      status: '進行中',
      priority: '高',
      startDate: '2024-01-15',
      endDate: '2024-03-15',
      teamMemberEmails: ['taro@company.com', 'hanako@company.com'],
      budget: 5000000
    });

    // プロジェクトのタスクを作成
    await manager.createTask({
      title: 'ホームページモックアップ作成',
      description: '新しいホームページのワイヤーフレームとビジュアルデザインを作成',
      status: '未着手',
      priority: '高',
      projectId: project.id,
      assigneeEmail: 'hanako@company.com',
      dueDate: '2024-01-25',
      estimatedTime: 16
    });

    // プロジェクトダッシュボードを取得
    const dashboard = await manager.getProjectDashboard(project.id);
    console.log('📊 プロジェクトダッシュボード:', dashboard.statistics);

    // レポートを生成して表示
    const report = await manager.generateProjectReport(project.id);
    console.log(report);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}
```

この例では以下の機能を示しています：

1. **複雑なリレーション管理**: ユーザー、プロジェクト、タスク間の多対多リレーション
2. **データ整合性**: 関連するレコードの検索と検証
3. **統計計算**: プロジェクトの進捗、工数分析
4. **レポート生成**: プロジェクトの詳細レポートの自動生成
5. **エラーハンドリング**: 適切なエラーメッセージとロギング

### 実行方法

1. 上記のスキーマを`schema.prisma`に保存
2. `notion-orm generate`でクライアントを生成
3. サンプルコードを実行

```bash
# 依存関係をインストール
npm install dotenv

# コードを実行
node -r dotenv/config project-manager.js
```