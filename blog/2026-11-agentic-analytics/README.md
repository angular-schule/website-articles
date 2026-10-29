---
title: 'Agentic Analytics with Angular: Chat with Your Sales Data, Keep Personal Data Out'
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
bio: '<a href="https://angular-buch.com"><img src="https://angular-buch.com/assets/img/book-cover-v1m.png" alt="Angular-Buch Cover" style="float: right; margin-top: -60px; margin-right: 30px; max-width: 250px;"></a>Johannes Hoppe is a trainer, consultant and developer specializing in Angular. He is a co-author of the <b>Angular book</b> (in German language), together with Ferdinand Malcher and Danny Koppenhagen. More info at <a href="https://angular-buch.com" style="text-decoration: underline;"><b>angular-buch.com</b></a>'
bioHeading: About Johannes Hoppe
author2: Angular.Schule Team
mail2: team@angular.schule
bio2: '<a href="https://angular.schule"><img src="/img/logo-angular-schule-gradient-550.png" alt="Angular.Schule Logo" style="float: right; margin-left: 30px; margin-top: -10px; margin-right: 30px; max-width: 250px;"></a>Want to build agentic UIs with Angular yourself? Join Ferdinand Malcher and Johannes Hoppe in our workshops, where you learn Angular the practical way – including modern AI tools. More at <a href="https://angular.schule" style="text-decoration: underline;"><b>angular.schule</b></a>'
bio2Heading: About our Angular workshops
published: 2026-11-03
keywords:
  - Angular
  - AI
  - Agentic UI
  - Generative UI
  - CopilotKit
  - AG-UI
  - Mastra
  - Agentic Analytics
  - Data Protection
  - GDPR
  - Entity Framework Core
  - Drizzle
  - SQL Server
  - PostgreSQL
language: en
header: agentic-analytics.jpg
---

**Agentic analytics works with Angular today: you ask your sales data a question and get a chart back. And you can keep personal data away from the language model, as long as the database enforces it rather than the prompt.**

You type a question, and a chart appears.
"How did revenue develop per quarter, split by sales channel?" The app answers with a line chart, a short analysis, and a button to pin the chart to a dashboard.
No SQL, no report designer, no ticket for the BI team.

That is the promise of **agentic analytics**.
In this article, I build such an app with Angular, piece by piece, from the database up to the chat.
And because this is a German blog at heart, we take a close look at the question that comes first in every real project here: **what happens to personal data?**

> The complete demo is on GitHub: [angular-schule/demo-agentic-analytics](https://github.com/angular-schule/demo-agentic-analytics).
> One `docker compose up` starts everything.

## Contents

[[toc]]

## Inspired by Manfred Steyer

The idea for this article comes from a workshop I enjoyed a lot.
On October 23, 2026, [Manfred Steyer](https://www.angulararchitects.io/) gave a free online live-coding workshop for AI Poland: *Build an Agentic Analytics App with Angular*.
In about two hours, he built a sales analytics app with Angular, [CopilotKit](https://www.copilotkit.ai/) (chat and UI components for agents), the *AG-UI* protocol (*Agent-User Interaction*, a streaming protocol between an agent and the frontend) and the agent framework [Mastra](https://mastra.ai/).
The [recording](https://ai-poland.pl/free-workshops/recordings) and his [code](https://github.com/manfredsteyer/agentic-sales) are public, and I can only recommend both.

Two of his thoughts stuck with me.
First: the chat is only the input channel. **The result is the dashboard**, which the user and the agent build together.
Second: when the model gets something wrong, the engineers have to improve the *harness* around it: guardrails, metadata, deterministic code.

Manfred's demo works with an obfuscated Google Analytics sample dataset from BigQuery, loaded into DuckDB.
I wanted to see how the architecture holds up in a setting that looks more like our customer projects:

- a **real relational database** with a classic data warehouse schema,
- **two typical backend stacks** that are interchangeable: ASP.NET Core with Entity Framework Core and SQL Server, or NestJS with Drizzle and PostgreSQL,
- and **data that contains people**, so we have to decide what the language model may see.

So this article does not repeat Manfred's code.
It retells the idea with its own demo, its own data, and a few decisions of its own.

## What We Build

![The finished app: chat on the left, the pinned dashboard on the right](screenshot.png "Chat on the left, dashboard on the right. The dashboard tiles run without the language model.")

On the left, the user chats with an agent.
The agent answers with **real Angular components**: line and bar charts, stat tiles, tables, and product cards with photos.
Every chart can be pinned to the dashboard on the right.
A pinned tile stores only the *query*, not the numbers, and asks the database again on every visit, **without the language model**.
That is fast, deterministic, and costs no tokens.

Before we build it, let's look at what the app is made of.

## The Stack from Bottom to Top

Here is every layer at a glance, with the vendor, the license, and the alternatives.

| Layer | In this demo | Vendor | License | Alternatives |
| --- | --- | --- | --- | --- |
| Data | AdventureWorksDW | Microsoft | MIT | Northwind, Contoso, your own data |
| Database | SQL Server 2025 **or** PostgreSQL 17 | Microsoft / PostgreSQL Global Development Group | Developer edition (free for development, not for production) / PostgreSQL License | MySQL, DuckDB, any warehouse |
| Data access | EF Core **or** Drizzle with postgres.js | Microsoft (.NET Foundation) / Drizzle Team / Pavel Porsager | MIT / Apache 2.0 / Unlicense | Dapper, Prisma, Kysely, TypeORM |
| Backend | ASP.NET Core **or** NestJS | Microsoft / NestJS team | MIT / MIT | Spring Boot, Express, Fastify |
| Agent | Mastra | Kepler Software, Inc. | Apache 2.0 (except the `ee/` folders) | LangGraph, Vercel AI SDK, OpenAI Agents SDK, Google ADK, Microsoft Agent Framework |
| Protocol | AG-UI | CopilotKit | MIT | your own server-sent events (SSE) format |
| Frontend | Angular with CopilotKit for Angular | Google / CopilotKit | MIT / MIT | Hashbrown (MIT), your own AG-UI client |
| Model | Claude, GPT or Gemini | Anthropic, OpenAI, Google | commercial API | local models via Ollama or vLLM |

A few remarks on this table:

- **CopilotKit** is a startup from Seattle, not a Microsoft product; "Copilot" is a generic word here. The core is open source; the company earns money with a commercial product for conversation history and analytics. CopilotKit also created the **AG-UI** protocol, which [many agent frameworks support](https://docs.ag-ui.com/introduction), among them Google ADK, AWS Strands, the Microsoft Agent Framework and Oracle Agent Spec.
- **Mastra** is Apache 2.0, with one exception: everything in folders named `ee/` (enterprise features such as parts of the authentication) is under a separate license. Our demo does not use those parts.
- **Hashbrown** by LiveLoveApp is an alternative from the Angular world. It runs the agent loop in the browser and talks to the model through a thin backend. CopilotKit, on the other hand, connects the Angular app to an agent that runs on the server. That is the right choice when tools need database access that must never reach the browser.

Let's go through the layers one by one.

## Layer 1: Data and What It Must Not Contain

### AdventureWorks

[AdventureWorks](https://github.com/microsoft/sql-server-samples) is Microsoft's classic sample database: a fictitious bicycle manufacturer that sells online to consumers and through resellers to bike shops, between December 2010 and January 2014.
The data warehouse variant **AdventureWorksDW** has exactly what an analytics demo needs: fact tables for both sales channels, plus dimensions for time, products, territories, resellers, customers and employees.
It is MIT-licensed, so we can use and redistribute it freely.

For SQL Server, the Docker image restores Microsoft's original backup.
For PostgreSQL, it imports the CSV files of the same release.
Both downloads are pinned to a commit and come with SHA-256 checksums that the image build compares, so both databases contain **identical data**.

### Company Names: Yes. People: No.

Now the interesting part.
Every reseller order in AdventureWorks has a sales representative: the **key account manager** for that bike shop.
In the warehouse, that is the column `FactResellerSales.EmployeeKey`, and behind it in `DimEmployee` are the name, email address, phone number, hourly rate, birth date and even a photo.

From the GDPR point of view, the distinction is clear:

- **The name of a company is not personal data.** A company is not a person. "Brakes and Gears bought for $877,107" is a business fact.
- **The name of a key account manager is personal data.** And as soon as we can group revenue by sales representative, we have built a performance evaluation of individual employees, and the works council will want to have a word about that.

So the rule for our app is: **the agent may analyse resellers, but never the people behind the sales.**
The same applies to online customers, who are private persons.

A prompt ("please don't talk about employees") cannot enforce this. The database can.
We create a schema `analytics` with three views.
They contain the sales lines of both channels, the resellers, and the products, and **no reference to a natural person**, not even as a key:

```sql
-- One row per order line of both sales channels.
-- Customers and sales representatives stay in the warehouse and never appear here.
CREATE VIEW analytics.Sales AS
SELECT ...                       -- channel, order date, product, territory, reseller, amounts
FROM ... AS lines
JOIN dbo.DimSalesTerritory AS t ON ...
WHERE CAST(SESSION_CONTEXT(N'TerritoryGroup') AS nvarchar(50)) IN (N'*', t.SalesTerritoryGroup);
```

The backends connect with a dedicated read-only account that may read the `analytics` schema and nothing else.
Even with a bug in the backend, there is no way to reach `DimEmployee`.

### A Data Scope That Fails Closed

The `WHERE` clause above shows a second protection.
Each backend may be restricted to one territory group, e.g. `Europe`.
The backend states its scope for every database connection: in SQL Server as a read-only session context, in PostgreSQL as a connection parameter.
**Without that value, the views return no rows.**
A forgotten configuration therefore shows nothing instead of everything.
The scope belongs to the deployment, not to a logged-in user; the demo has no login. With authentication, the backend would write the user's scope into the same session value.

Secure views protect the data. But they do not yet stop a model from writing arbitrary SQL against them.

## Layer 2: A Semantic Layer Instead of Text-to-SQL

The obvious idea would be to let the language model write SQL.
Please don't.
A model that writes SQL can read every column the database account can read, can write queries that run for minutes, and can be talked into almost anything by a cleverly worded question.

Instead, both backends offer a small **semantic layer**: a fixed list of *dimensions* (year, quarter, month, channel, product category, country, reseller, …) and *measures* (revenue, cost, margin, quantity, orders).
A request is plain JSON:

```json
{
  "measures": ["revenue", "margin"],
  "groupBy": ["productCategory"],
  "filters": [
    { "dimension": "territoryGroup", "operator": "eq", "values": ["Europe"] },
    { "dimension": "year", "operator": "eq", "values": [2013] }
  ]
}
```

Names outside the list are rejected with a helpful error message that names the allowed values. The model reads it and corrects its next call.
Values never become part of the SQL text; they travel as query parameters.
Fixed limits keep queries small: at most three dimensions, ten filters and 1,000 rows per request.

There is no dimension `salesRep`.
**The model cannot ask for what does not exist.**

### .NET: Expression Trees with Entity Framework Core

In ASP.NET Core, the semantic layer maps every dimension to a typed lambda expression:

```csharp
Numeric("year", "Order year", "Calendar year of the order date.", s => s.OrderYear),
Text("country", "Country", "Country of the sales territory.", s => s.SalesTerritoryCountry, listValues: true),
Text("reseller", "Reseller", "Name of the reseller company. Empty for online sales.", s => s.ResellerName, listValues: false),
```

At runtime, the requested dimensions are combined into one `GroupBy` key with the `System.Linq.Expressions` API, and Entity Framework Core translates the result into parameterized SQL:

```csharp
var sale = Expression.Parameter(typeof(Sale), "s");
var bindings = dimensions.Select((dimension, index) =>
{
    var value = Rebind(dimension.Selector, sale);
    return dimension.IsNumeric
        ? Expression.Bind(KeyProperty("I", index), Expression.Convert(value, typeof(int?)))
        : Expression.Bind(KeyProperty("S", index), value);
});
return Expression.Lambda<Func<Sale, GroupKey>>(
    Expression.MemberInit(Expression.New(typeof(GroupKey)), bindings), sale);
```

If you know [Dynamic LINQ](https://dynamic-linq.net/), this looks familiar: both build expression trees at runtime.
The difference matters here: Dynamic LINQ *parses strings* such as `"new(OrderYear, Country)"`.
That is convenient, but it puts an expression parser into the path between the language model and the database, and versions before 1.3.0 had a [remote code execution vulnerability](https://github.com/advisories/GHSA-w65q-jcmv-28gj) (CVE-2023-32571) in exactly that parser.
Our approach only combines lambdas that were compiled together with the backend. There is nothing to parse.
The price is a little more code.

### Node.js: Drizzle

In NestJS, [Drizzle](https://orm.drizzle.team/) plays the same role.
The views are declared as existing views, and the dimensions point to Drizzle columns:

```ts
{ name: 'country', label: 'Country', description: 'Country of the sales territory.', isNumeric: false, listValues: true, column: sales.salesTerritoryCountry },
```

Measures are SQL fragments built with Drizzle's `sql` template tag, so columns are interpolated by Drizzle and nothing is concatenated as text:

```ts
const MEASURE_SQL: Record<MeasureName, SQL<number>> = {
  revenue: sql<number>`round(coalesce(sum(${sales.salesAmount}), 0), 2)`.mapWith(Number),
  margin: sql<number>`round(coalesce(sum(${sales.salesAmount}), 0) - coalesce(sum(${sales.totalProductCost}), 0), 2)`.mapWith(Number),
  orders: countDistinct(sales.salesOrderNumber),
  // ...
};
```

### Two Backends, One Answer

Both backends serve the same HTTP contract: `GET /api/schema`, `POST /api/sales/aggregate`, plus a small product catalogue with photos.
Errors are [RFC 9457 problem details](https://www.rfc-editor.org/rfc/rfc9457) in both.

"The same contract" is easy to claim, so the repository contains contract tests that send the same requests to both backends and compare the answers.
They found two differences that would otherwise have been subtle bugs:

- **Sorting of NULL values.** SQL Server puts NULLs first in ascending order, PostgreSQL puts them last. The Node backend says `nulls first` / `nulls last` explicitly.
- **Rounding.** SQL Server's `money` type has four decimal places. Both backends round amounts to cents.

With a safe and stable data API in place, the agent can use it.

## Layer 3: The Agent with Mastra

The agent is a small Node.js service built with [Mastra](https://mastra.ai/).
It has two server tools: `querySales` for the semantic layer, and `findProducts` for the product catalogue. The frontend adds a third one later.

### Tools Generated from the Semantic Layer

At startup, the agent asks the data backend for `/api/schema` and builds the tool schemas from it.
Dimension and measure names become enums in [Zod](https://zod.dev/), the TypeScript schema library that Mastra uses to describe tool parameters. The model sees exactly the names that exist:

```ts
const dimensionNames = schema.dimensions.map((d) => d.name) as [string, ...string[]];
const measureNames = schema.measures.map((m) => m.name) as [string, ...string[]];

const querySales = createTool({
  id: 'querySales',
  description: `
    Aggregates the sales data and shows the result to the user as a chart, table or key figure.
    The user sees the visualization right away, so do not repeat the numbers as a table in the answer.
    Put the measure the title is about first. ...
  `,
  inputSchema: z.object({
    title: z.string(),
    chart: z.enum(['bar', 'line', 'table', 'kpi']),
    query: z.object({
      measures: z.array(z.enum(measureNames)).min(1),
      groupBy: z.array(z.enum(dimensionNames)).max(schema.limits.maxGroupBy).optional(),
      // filters, orderBy, limit ...
    }),
  }),
  execute: async ({ query }) => {
    try {
      return await dataApi.aggregate(query);
    } catch (error) {
      return { error: describeError(error) };
    }
  },
});
```

Every failure becomes a tool result instead of an exception.
The model can correct a rejected request or tell the user that the database is not reachable, and the chat never hangs.

The system prompt contains the dataset description, all dimensions with their allowed values, and a few rules.
The most important one:

```text
- Personal data is not part of the data model: no sales representatives or key account managers,
  no contact persons, no customers as persons. If asked, say that this data is deliberately not
  available to you and offer an analysis at company, product or region level instead.
```

Note the order: the database guarantees that the data is not there, the prompt only makes sure the agent explains it politely.

### Switching the Model

Mastra has a [model router](https://mastra.ai/models): the model is a single string like `anthropic/claude-sonnet-5-5`, `openai/gpt-5.6-terra` or `google/gemini-3-flash-preview`, and the API key comes from the provider's usual environment variable.
In the demo, it is one line in `agent/.env`.

### Serving AG-UI with a Plain Node Server

[AG-UI](https://docs.ag-ui.com/) is the protocol between the agent and the frontend.
The browser posts the conversation; the agent answers with a stream of events as server-sent events: run started, text deltas, tool call started, tool call arguments, tool result, run finished.

The package `@ag-ui/mastra` translates a Mastra agent into an AG-UI agent.
Around it, a plain `node:http` server is enough:

```ts
const agent = new MastraAgent({
  agentId: 'analyst',
  agent: analyst,
  threadId: input.threadId,
  initialMessages: input.messages,
  streamServerToolCalls: true,
});

response.writeHead(200, { 'content-type': 'text/event-stream' });
await agent.runAgent(input, {
  onEvent: ({ event }) => response.write(`data: ${JSON.stringify(event)}\n\n`),
});
response.end();
```

The agent keeps no memory: CopilotKit sends the whole thread with every request.
For a demo, that is ideal: no conversation ends up in a database on the server.

### Pitfalls: Telemetry and Peer Dependencies

- **Mastra sends usage telemetry by default** to PostHog, including token usage of the agents ([source](https://github.com/mastra-ai/mastra/blob/main/packages/core/src/telemetry/posthog.ts)). The agent switches it off with `MASTRA_TELEMETRY_DISABLED=1`. Check this in your own projects; it is easy to miss.
- `@ag-ui/mastra` declares `@copilotkit/runtime` as a peer dependency, and npm installs peers automatically. The runtime brings a long list of dependencies, including analytics packages. Our agent does not need it, so the demo installs peers explicitly instead (`legacy-peer-deps=true` in the agent's `.npmrc`). Manfred solves the same problem with an [empty stub package](https://github.com/manfredsteyer/agentic-sales/tree/main/agent/libs/copilotkit-runtime-stub).

The server side is complete. Now to the part where Angular developers feel at home.

## Layer 4: Angular with CopilotKit

### Connecting the Agent

CopilotKit for Angular is configured with `provideCopilotKit()`.
We do not use CopilotKit's own runtime or cloud; the agent is an AG-UI endpoint, so an `HttpAgent` from `@ag-ui/client` is all it takes:

```ts
export const copilotKitConfig: CopilotKitConfig = {
  selfManagedAgents: {
    analyst: new HttpAgent({ url: '/agent/ag-ui/analyst' }),
  },
  renderToolCalls: [salesViewRenderer, productCardsRenderer],
  enableInspector: false,
};
```

In the template, the chat is one element:

```html
<copilot-chat [agentId]="agentId" />
```

### Three Ways to Generate UI

CopilotKit offers three ways to connect an Angular component to the agent.
Manfred summed up the difference nicely: with `registerComponent()` and `registerFrontendTool()`, **the model decides** to show something; with `registerRenderToolCall()`, **CopilotKit decides** to draw the result of a server tool.

| API | Who defines the tool? | What happens? |
| --- | --- | --- |
| `registerComponent()` | the frontend | The model calls the tool *to show* the component and passes the data as arguments. |
| `registerFrontendTool()` | the frontend | The model calls the tool, the handler runs in the browser (and may render a component). |
| `registerRenderToolCall()` | the agent | A server tool runs; the frontend only *draws* its arguments and result. |

Our charts use `registerRenderToolCall()`.
The tool runs on the server, and the component receives the arguments (title, chart type, query) and the result (the rows).
The model does not have to repeat the numbers as component arguments, which saves tokens and avoids transcription errors.

```ts
@Component({
  selector: 'app-sales-view-renderer',
  imports: [SalesChart],
  template: `
    @if (result(); as result) {
      @if (view(); as view) {
        <app-sales-chart [title]="view.title" [kind]="view.chart" [result]="result" />
        <button type="button" [disabled]="pinned()" (click)="pin(view)">Pin to dashboard</button>
      }
    } @else {
      <p class="loading">{{ toolCall().args.title ?? 'Querying sales' }} …</p>
    }
  `,
})
export class SalesViewRenderer implements ToolRenderer<SalesView> {
  readonly toolCall = input.required<AngularToolCall<SalesView>>();
  // view(), result(), pinned() are computed signals over toolCall()
}

export const salesViewRenderer: RenderToolCallConfig<SalesView> = {
  name: 'querySales',
  args: salesViewSchema,
  component: SalesViewRenderer,
};
```

`toolCall` is a signal input.
While the model is still streaming the arguments, `status` is `in-progress` and `args` is partial, so the title appears before the query is complete.
That is why every field is treated as optional until the call is complete.

Pinning works both ways: by button, and by asking the agent ("Please pin that chart to the dashboard").
For the second, the frontend registers a tool that runs in the browser:

```ts
registerFrontendTool({
  name: 'pinToDashboard',
  description: 'Pins a view to the dashboard next to the chat. Only when the user asks for it.',
  parameters: salesViewSchema,
  handler: async (view) => {
    // CopilotKit passes the model's arguments as parsed JSON, without checking them against the schema.
    const parsed = salesViewSchema.safeParse(view);
    if (!parsed.success) return `Not pinned, the view is invalid: ${parsed.error.message}`;
    dashboard.pin(parsed.data);
    return `Pinned "${parsed.data.title}" to the dashboard.`;
  },
});
```

The handler validates again, and that is a trap worth knowing: the Zod schema describes the tool for the model, but CopilotKit does not validate the arguments.
Without the check, a single malformed pin is stored as is, and on the next page load the dashboard's validation discards *all* tiles.
**Treat everything the model sends as untrusted input**, just like a form submitted from the internet.

### Charts: Telling the Truth

The charts are plain Angular components (bars in HTML and CSS, lines in SVG) with tooltips, a legend for several series, a colour palette that works for colour-blind readers, and a switch to a table view.
No chart library is needed for that.

A typical trap in generative UI: ask for "the gross margin of the product categories in Europe in 2013", and the model requests revenue *and* margin and titles the chart "Gross margin by product category".
A chart that simply plots the first measure then shows revenue under a margin title, while the text answer below is correct.

Two things prevent that here: the tool description tells the model that the first measure is plotted, and the chart does not guess.
Measures with the same unit are drawn side by side, and the chart always says what it shows ("Revenue (USD)", "Values (USD)"), taken from the query and not from the title.

### Dashboard: Running Without the Model

A pinned tile is a `SalesView`: title, chart type, query.
It is stored in `localStorage` and loaded with `httpResource()` directly from the data backend:

```ts
protected readonly data = httpResource<AggregateResponse>(() => ({
  url: '/api/sales/aggregate',
  method: 'POST',
  body: this.tile().query,
}));
```

Manfred calls this the difference between *design mode* and *runtime mode*: the agent helps to design the view once, and from then on it runs like any other report.

## Test: Who Is the Key Account Manager?

Time for the question the whole data layer was built for.
The chat offers a few example questions above the input field. One of them is "Who is the key account manager of our biggest reseller?", and the agent answered:

> I can't tell you that. Data on people, such as key account managers and sales representatives, is deliberately not available to me. I can show you the biggest reseller as a company, though.

Then it called `querySales`, showed the top 10 resellers as a bar chart, and named the biggest one: Brakes and Gears, with $877K from 12 orders.
That is exactly the line we drew: **company names yes, people no.**
And if the model had tried anyway, there would have been nothing to find.

## What Goes to the Model Provider?

The protection has limits, and you should know them.

- **Everything a tool returns goes to the language model.** The aggregated rows, the product names, the reseller names. The semantic layer and the views decide what that is. That is why personal data must be kept out *before* the model instead of being filtered *after* it.
- **Product photos do not.** The product cards load the images directly from the data backend; the model only sees product keys and names.
- **The dashboard does not.** Pinned tiles never touch the model.
- **The browser talks to one origin only.** The app loads no fonts, scripts or telemetry from third parties, and the CopilotKit Inspector (which [reports usage](https://github.com/CopilotKit/CopilotKit/blob/main/packages/web-inspector/src/lib/telemetry.ts) when opened) is disabled.
- **Removing a column does not prevent every inference.** In AdventureWorks, only two to six sales representatives sold in each region, and in Germany only two. Anyone who knows who looks after the German bike shops gets very close to their figures with "revenue per country", although the system knows nothing about them. In a real project, agree on the granularity with your data protection officer and the works council: suppress small groups, use coarser regions, or leave a dimension out entirely. Technically, that is the same principle as the views: what is not in the semantic layer cannot be asked for. Only this time it applies to the dimensions instead of the columns.

For real customer data, you also need a data processing agreement with the model provider, ideally with EU data residency, or a model you host yourself.
With Mastra's model router, switching is one line.

One more number for your planning: CopilotKit is not small.
It brings Markdown rendering, syntax highlighting, KaTeX and web components, and the initial bundle of the demo is about 1.5 MB compressed.
In my opinion, that is fine for an internal analytics tool, but not for a public landing page.

## What This Demo Leaves Out

Manfred's workshop goes further in a few directions that I deliberately skipped:

- **Shared agent state** (AG-UI state management), where the agent itself edits the dashboard, e.g. "change every tile to a bar chart".
- **A2UI**, Google's format for UIs that the agent assembles from a catalogue of components at runtime.
- **JSONata** as a sandbox in which the model can compute derived figures.
- **Human-in-the-loop** approvals for large queries.

If you want to see these, watch his recording and read his code. In my opinion, that is the natural next step after this article.

## Conclusion

Agentic analytics with Angular works today, and it works with the stacks we already use.
Five architectural decisions make it work:

1. **Keep personal data out of the views**, enforced by the database, not by the prompt.
2. **Give the model a semantic layer instead of SQL.** Typed in C# or TypeScript, validated on the server.
3. **Let the agent call tools, and let Angular draw them.** CopilotKit and AG-UI do the plumbing.
4. **Treat model output as untrusted input**, and let components decide what is true.
5. **Pin the result** and run it without the model from then on.

The complete code with both backends is on GitHub: **[angular-schule/demo-agentic-analytics](https://github.com/angular-schule/demo-agentic-analytics)**.
Clone it, run `docker compose --profile node up`, and ask your own questions.
Many thanks to Manfred Steyer for the inspiring workshop!

How do you keep personal data away from your agents? I'm curious about your approaches, so let me know.
