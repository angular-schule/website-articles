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
  - A2UI
  - MCP
  - Mastra
  - Microsoft Agent Framework
  - Agentic Analytics
  - Data Protection
  - GDPR
  - Entity Framework Core
  - Drizzle
  - SQL Server
  - PostgreSQL
  - OpenAPI
language: en
header: agentic-analytics.jpg
---

**Agentic analytics works with Angular today: you ask your sales data a question and get a chart back. And you can keep personal data away from the LLM, as long as the database enforces it rather than the prompt.**

You type a question, and a chart appears.
"How did revenue develop per quarter, split by sales channel?" The app answers with a line chart, a short analysis, and a button to pin the chart to a dashboard.
No SQL, no report designer, no ticket for the business intelligence (BI) team.

That is the promise of **agentic analytics**.
In this article, I build such an app with Angular, piece by piece, from the database up to the chat, with a backend in .NET or in Node.js, as you prefer.
If you have never built an app with an AI agent before, that is fine: the article explains every term on the way, introduces the protocols you will keep hearing about (AG-UI, A2UI, MCP, A2A), and names an alternative for every library we use.
And because this is a German blog at heart, we take a close look at the question that comes first in every real project here: **what happens to personal data?**

> The complete demo is on GitHub: [angular-schule/demo-agentic-analytics](https://github.com/angular-schule/demo-agentic-analytics).
> Copy `.env.example` to `.env` and `agent/.env.example` to `agent/.env`, add your API key, run `docker compose --profile node up` (or `--profile dotnet`), and open http://localhost:8080.

## Contents

[[toc]]

## Inspired by Manfred Steyer

The idea for this article comes from a workshop I enjoyed a lot.
On October 23, 2026, [Manfred Steyer](https://www.angulararchitects.io/) gave a free online live-coding workshop for AI Poland: *Build an Agentic Analytics App with Angular*.
In about two hours, he built a sales analytics app with Angular, [CopilotKit](https://www.copilotkit.ai/), the AG-UI protocol and the agent framework [Mastra](https://mastra.ai/).
The [recording](https://ai-poland.pl/free-workshops/recordings) and his [code](https://github.com/manfredsteyer/agentic-sales) are public, and I can only recommend both.

Two of his thoughts stuck with me.
First: the chat is only the input channel. **The result is the dashboard**, which the user and the agent build together.
Second: when the model gets something wrong, the engineers have to improve the *harness* around it: guardrails, metadata, deterministic code.

Manfred's demo works with an obfuscated Google Analytics sample dataset from BigQuery, loaded into DuckDB.
I wanted to see how the architecture holds up in a setting that looks more like our customer projects:

- a **relational database** with a classic data warehouse schema,
- **two typical backend stacks** that are interchangeable: ASP.NET Core with Entity Framework Core and SQL Server, or NestJS with Drizzle and PostgreSQL,
- and **data that contains people**, so we have to decide what the LLM may see.

So this article does not repeat Manfred's code.
It retells the idea with its own demo, its own data, and a few decisions of its own.
The building blocks are the same as his: CopilotKit in Angular, AG-UI in between, Mastra on the server. For the .NET track, the Microsoft Agent Framework takes Mastra's place.

## What We Build

![The finished app: chat on the left, the pinned dashboard on the right](screenshot.png "Chat on the left, dashboard on the right. The dashboard tiles run without the LLM.")

On the left, the user chats with an agent.
The agent answers with **Angular components**: line and bar charts, stat tiles, tables, and product cards with photos.
Every chart can be pinned to the dashboard on the right.
A pinned tile stores only the *query*, not the numbers, and asks the database again on every visit, **without the LLM**.
That is fast, deterministic, and costs no tokens.
Below both, a [traffic window](#watching-the-traffic) shows every message between browser, agent and LLM provider, so you can see what really goes over the wire.

Before we build it, let's sort out the vocabulary.

## The Vocabulary in Five Minutes

If you already know what a tool call is, skip ahead to [the protocols](#the-protocols-ag-ui-a2ui-mcp-and-a2a).

**Large language model (LLM).**
An LLM such as Claude, GPT or Gemini reads text and writes text.
It runs at a provider (Anthropic, OpenAI, Google) or on your own hardware, and you talk to it over an HTTP API.
On its own, it knows nothing about your database, and it cannot run code.
It reads and writes text in *tokens*, pieces of a few characters; providers bill per token, and every request sets a limit for the answer.

**Tool and tool call.**
A *tool* is a function you describe to the model: a name, a description, and a JSON schema for the parameters.
When the model decides that a tool helps, it does not answer with prose, but with a *tool call*: "call `querySales` with these arguments".
Your code runs the function and sends the result back to the model, which then continues writing.
The model never touches the database itself; it can only ask for the tools you offer.
Providers call this *function calling* or *tool use*.
A tool runs either on the server (a *backend tool*) or in the browser (a *frontend tool*).
The names vary between frameworks: Mastra calls browser tools *client tools*, the Vercel AI SDK says *server-side* and *client-side tools*, and at Anthropic, *server tools* are tools that Anthropic itself runs, such as web search.
The [glossary](#glossary) at the end lists the names per framework.

**Agent.**
An agent is an LLM in a loop: the model writes, calls a tool, reads the result, maybe calls the next tool, and finally answers.
In our app, the agent has a system prompt (its standing instructions), two tools, and access to a model.
Everything around the model that keeps it on track (prompt, tool schemas, validation, limits) is what Manfred calls the *harness*.

**Agent framework.**
You can write that loop yourself, but you will soon want streaming, retries, validation of tool arguments, switching providers, and logs.
An agent framework provides these building blocks.
We use **Mastra** for TypeScript and the **Microsoft Agent Framework** for C#.

**Generative UI.**
The agent's answer is more than text: it is user interface.
In our app, a question produces a chart, a table, or product cards.
CopilotKit, which also maintains the AG-UI protocol, sorts generative UI into [three kinds](https://github.com/CopilotKit/generative-ui), from "the app decides everything" to "the agent decides everything":

| Kind | Who builds the UI? | Example |
| --- | --- | --- |
| **Controlled** | The app has finished components. The agent picks one and supplies the data. | Our charts and product cards |
| **Declarative** | The agent sends a description of the UI (cards, lists, forms) from a catalogue the app knows. The app renders it with its own components. | A2UI, Open-JSON-UI |
| **Open-ended** | The agent delivers a complete piece of UI, often HTML in a sandboxed iframe. The app only provides the frame. | MCP Apps |

The further down the table, the more freedom the agent has, and the less control the app keeps over layout, design and security.
For analytics, where numbers have to be correct and charts have to look like the rest of the product, controlled generative UI is a good fit.
This demo uses only that kind.

**Server-sent events (SSE).**
A plain HTTP response that stays open and delivers one message after another.
The browser can show the first words of an answer while the model is still writing the rest.

**Semantic layer.**
A layer between the database and whoever asks the questions: a BI tool, a person, or in our case the model.
It defines the business vocabulary once.
*Measures* are numbers that can be aggregated, each with a fixed formula: revenue is the sum of the sales amount, gross margin is revenue minus product cost.
*Dimensions* are the attributes you group and filter by: year, country, product category.
A query names only these terms, for example "revenue and margin per product category in Europe", and the semantic layer translates it into SQL with the right columns, joins and aggregates.
It is not the ORM (object-relational mapper): EF Core or Drizzle map tables to objects for developers, while the semantic layer sits on top of them and decides which business questions may be asked at all.
The term comes from business intelligence, where Cube, dbt (MetricFlow), Looker (LookML) and Power BI (semantic models) offer one as a product.
Our demo builds a small one itself.
We will spend a whole section on it, because it decides what the model can and cannot ask for.

## The Protocols: AG-UI, A2UI, MCP and A2A

When you start reading about agents, you will meet four protocols with confusingly similar names.
They do different jobs, and an app can use several of them at once.

![AG-UI connects app and agent, MCP connects agent and tools, A2A connects agents, A2UI is a UI format](protocols.svg "Where the agent protocols sit")

### AG-UI: Agent ↔ User

[AG-UI](https://docs.ag-ui.com/) (*Agent-User Interaction Protocol*) connects an agent with the app in front of the user.
CopilotKit [announced it in May 2025](https://www.copilotkit.ai/blog/introducing-ag-ui-the-protocol-where-agents-meet-users); it grew out of CopilotKit's work with LangChain and CrewAI, and it is [MIT-licensed on GitHub](https://github.com/ag-ui-protocol/ag-ui).

The app sends the agent a request with the conversation so far, the tools that the frontend offers, and optionally a shared state.
The agent answers with a stream of typed **events**:

- **Lifecycle:** `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`, steps in between.
- **Text:** `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT` (one piece of text at a time), `TEXT_MESSAGE_END`.
- **Tool calls:** `TOOL_CALL_START`, `TOOL_CALL_ARGS` (the arguments, streamed in pieces), `TOOL_CALL_END`, `TOOL_CALL_RESULT`.
- **State:** `STATE_SNAPSHOT` and `STATE_DELTA` (a JSON Patch) for state that the agent and the app share.
- And a few more for reasoning, activities, sub-agents and custom events.

AG-UI does not prescribe a transport. Server-sent events are the common choice, and the one we use.
The protocol is supported by [many agent frameworks](https://docs.ag-ui.com/integrations), among them Mastra, LangGraph, CrewAI, Google ADK, Microsoft Agent Framework, AWS Strands Agents and Pydantic AI.
That is the main benefit for us: the Angular side does not care which framework runs on the server.

### A2UI: a Format for Generated UI

[A2UI](https://github.com/a2ui-project/a2ui) is a different kind of thing.
Google [introduced it in December 2025](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) as an Apache 2.0 project; at the time of writing, it is an early public preview with v0.9 as the stable release.
A2UI is **a format, not a connection**: the agent sends a declarative JSON description of a UI ("a card with a heading, a list and a button"), and the client renders it with its own native components.
The client keeps a catalogue of trusted components, and the agent can only request components from that catalogue.
Because the description is data and not code, there is no script to inject.
There are renderers for Angular (`@a2ui/angular`), Lit and React, and Flutter uses A2UI under the hood of its GenUI SDK.

So what is the difference to AG-UI?
The AG-UI docs say it clearly: [AG-UI is not a generative UI specification](https://docs.ag-ui.com/concepts/generative-ui-specs), it is the runtime connection between agent and app.
A2UI describes *what* to show; AG-UI (or A2A) is *how* it gets there.
The two work together, and CopilotKit supported A2UI from the first day.

In our demo, the agent cannot invent new UI. It can only choose between our chart, table and product card components.
That is controlled generative UI, so we do not need A2UI.
It becomes interesting when the agent should assemble forms or layouts that nobody built in advance.

### MCP: Agent ↔ Tools

The [Model Context Protocol](https://modelcontextprotocol.io/) connects an agent with tools and data sources.
Anthropic [published it in November 2024](https://www.anthropic.com/news/model-context-protocol) and [donated it in December 2025](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation) to the Agentic AI Foundation under the Linux Foundation.
An MCP server offers tools in a standard way, so every MCP-capable agent or chat client can use them without custom code.
The extension [MCP Apps](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/) lets an MCP server also deliver interactive UI, which the host shows in a sandboxed iframe: that is the open-ended kind of generative UI.

Our two tools are tailored to this one app, and they call the semantic layer directly.
An MCP server would make sense if other agents, or a chat client such as Claude, should use the same sales tools.

### A2A: Agent ↔ Agent

[Agent2Agent (A2A)](https://a2a-protocol.org/) lets agents from different teams or vendors work together: one agent hands a task to another and gets the result back.
Google [launched it in April 2025](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/), and since June 2025 it is a [Linux Foundation project](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents).
Our app has a single agent, so A2A plays no role here.

### The Protocols at a Glance

| | Connects | Started by | Our demo |
| --- | --- | --- | --- |
| **AG-UI** | agent ↔ app (user) | CopilotKit | yes, between Angular and the agent |
| **A2UI** | a UI format, travels over AG-UI or A2A | Google | no, our components are fixed |
| **MCP** | agent ↔ tools and data | Anthropic, now Linux Foundation | no, the tools call the semantic layer directly |
| **A2A** | agent ↔ agent | Google, now Linux Foundation | no, there is one agent |

## Your First Decision: Where Does the Agent Run?

Before we look at the layers, one question shapes everything else: does the agent get its own server, or does it move into the backend you already have?

![Path A: the agent runs inside the backend. Path B: the agent is a separate service in front of it.](paths.svg "Path A or path B")

**Path A: the agent in the backend.**
The agent is a module of your existing backend.
Its tools call the semantic layer with a method call, and you deploy, monitor and secure one process, as before.
The price: the agent framework has to exist in your backend's language.
In this article, that is Mastra for NestJS and the Microsoft Agent Framework for ASP.NET Core.

**Path B: the agent as a separate service.**
The agent runs in its own process and calls the backend's HTTP API, like any other client.
Then you can pick the agent framework independently of the backend, e.g. Mastra in front of an ASP.NET Core backend.
The model's API key and the database credentials live in different processes, and the agent can be scaled or switched off on its own.
The price: a second service to host, and one more network hop for every tool call.

| | Path A: in the backend | Path B: separate service |
| --- | --- | --- |
| Processes to run | one | two |
| Agent framework | must match the backend language | free choice |
| Tool call to the data | method call | HTTP |
| API key and database credentials | in the same process | in different processes |
| Typical fit | one team, one backend | several backends or teams share one agent |

This article follows **path A**, because one process is easier to host than two.
That gives us two tracks with the same Angular app on top:

- **Node.js track:** NestJS + Drizzle + PostgreSQL, with **Mastra** as the agent.
- **.NET track:** ASP.NET Core + Entity Framework Core + SQL Server, with the **Microsoft Agent Framework** as the agent.

Both agents get the same system prompt and the same two tools, so we can also see whether the two frameworks give similar results.
Path B has [its own section](#path-b-the-agent-as-a-separate-service) further down; the demo runs it with one more Compose profile.

## The Stack from Bottom to Top

Now to the app itself. Here are all layers in one picture:

![The layers of the demo: Angular with CopilotKit, AG-UI and the HTTP contract, two interchangeable backends with the agent inside, the LLM, the database](stack.svg "The layers of the demo. Dashboard tiles and photos skip the agent.")

And here they are as a table, with vendor and license:

| Layer | In this demo | Vendor | License |
| --- | --- | --- | --- |
| Data | AdventureWorksDW | Microsoft | MIT |
| Database | SQL Server 2025 **or** PostgreSQL 17 | Microsoft / PostgreSQL Global Development Group | Developer edition (free for development, not for production) / PostgreSQL License |
| Data access | EF Core **or** Drizzle with postgres.js | Microsoft (.NET Foundation) / Drizzle Team / Rasmus Porsager | MIT / Apache 2.0 / Unlicense |
| Backend | ASP.NET Core **or** NestJS | Microsoft / NestJS team | MIT / MIT |
| Agent | Microsoft Agent Framework (.NET) **or** Mastra (Node.js) | Microsoft / Kepler Software, Inc. | MIT / Apache 2.0 (except the enterprise `ee/` folders, see layer 3) |
| Protocol | AG-UI | started by CopilotKit, open source | MIT |
| Frontend | Angular with CopilotKit for Angular | Google / CopilotKit | MIT / MIT |
| Model | Claude, GPT or Gemini | Anthropic, OpenAI, Google | commercial API |

In each of the following sections, a small table says what the layer is, who makes it, why we need it, and what you could use instead.

## Layer 1: Data and What It Must Not Contain

| Data | AdventureWorksDW |
| --- | --- |
| What it is | Microsoft's sample data warehouse of a fictitious bicycle manufacturer |
| Made by | Microsoft, in the [sql-server-samples](https://github.com/microsoft/sql-server-samples) repository, MIT license |
| Why we need it | Realistic sales data with two channels, products, regions and companies, and with people in it, so data protection is a real question |
| Alternatives | Northwind or Contoso as sample data, or your own data warehouse |

### The Sample Data: AdventureWorks

AdventureWorks sells bicycles online to consumers and through resellers to bike shops, between December 2010 and January 2014.
The data warehouse variant **AdventureWorksDW** has exactly what an analytics demo needs: *fact tables* for both sales channels (one row per order line with the amounts), plus *dimension tables* for time, products, territories, resellers, customers and employees (the descriptive data).
The semantic layer's dimensions are built from the columns of these tables.
It is MIT-licensed, so we can use and redistribute it freely.

For SQL Server, the Docker image restores Microsoft's original backup.
For PostgreSQL, it imports the CSV files of the same release.
Both downloads are pinned to a commit and come with SHA-256 checksums that the image build compares, so both databases contain **identical data**.

| Database | SQL Server 2025 or PostgreSQL 17 |
| --- | --- |
| What it is | The relational database that stores the data warehouse and the views the app may read |
| Made by | Microsoft (SQL Server, the Developer edition is free for development) / the PostgreSQL Global Development Group (PostgreSQL License) |
| Why we need it | It enforces the data protection rules: views, a read-only account, row-level security per connection |
| Alternatives | MySQL, MariaDB, DuckDB for local analytics, or a cloud warehouse such as BigQuery or Snowflake |

### Company Names: Yes. People: No.

Every reseller order in AdventureWorks has a sales representative: the **key account manager** for that bike shop.
In the warehouse, that is the column `FactResellerSales.EmployeeKey`, and behind it in `DimEmployee` are the name, email address, phone number, hourly rate, birth date and even a photo.

From the point of view of the GDPR (General Data Protection Regulation), the distinction is clear:

- **The name of a company is not personal data.** The GDPR protects natural persons and, according to [recital 14](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679), does not cover the name and contact details of a legal person. "Brakes and Gears bought for $877,107" is a business fact. Be careful with sole traders, whose company name is often their own name.
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

### Row-Level Security That Fails Closed

The `WHERE` clause above shows a second protection.
Each backend may be restricted to one territory group, e.g. `Europe`.
The backend states its scope for every database connection: in SQL Server as a read-only session context, in PostgreSQL as a connection parameter.
**Without that value, the views return no rows.**
A forgotten configuration therefore shows nothing instead of everything.
The setting is called `DATA_SCOPE`, with the values `Europe`, `North America`, `Pacific`, or `*` for everything. For convenience, the demo's Compose file defaults to `*`; in production, set the value explicitly.
This principle is called *row-level security*: the database decides per connection which rows exist.
The demo writes the filter into the views themselves; SQL Server (security policies) and PostgreSQL (row security policies) also offer it as a built-in feature on the tables.
The scope belongs to the deployment, not to a logged-in user; the demo has no login. With authentication, the backend would write the user's scope into the same session value.

Secure views protect the data. But they do not yet stop a model from writing arbitrary SQL against them.

## Layer 2: A Semantic Layer Instead of Text-to-SQL

| Backend | ASP.NET Core with EF Core, or NestJS with Drizzle |
| --- | --- |
| What it is | A small HTTP API that turns a JSON query into safe, parameterized SQL |
| Made by | Microsoft (ASP.NET Core, Entity Framework Core, MIT) / the NestJS team (MIT), the Drizzle Team (Apache 2.0) and Rasmus Porsager (postgres.js, Unlicense) |
| Why we need it | The model never writes SQL. The backend decides which measures and dimensions exist and checks every request |
| Alternatives | Any backend you know: Spring Boot, Express, Fastify, Go. For data access: Dapper, Prisma, Kysely, TypeORM. Dedicated semantic layers such as Cube or dbt's MetricFlow do the same job as a product |

The obvious idea would be to let the LLM write SQL.
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

In ASP.NET Core, the semantic layer maps every dimension to a typed lambda expression, and every measure to an aggregate over one group of order lines:

```csharp
Time("year", "Order year", "Calendar year of the order date.", s => s.OrderYear),
Text("country", "Country", "Country of the sales territory.", s => s.SalesTerritoryCountry, listValues: true),
Text("reseller", "Reseller", "Name of the reseller company. Empty for online sales.", s => s.ResellerName, listValues: false),

new("revenue", "Revenue", "Sum of the sales amount.", "USD",
    g => Math.Round(g.Sum(s => s.SalesAmount) ?? 0m, 2)),
```

`listValues` decides whether the allowed values of a dimension go into the system prompt: the countries do, the resellers do not, because there are too many of them.

At runtime, the requested dimensions are combined into one `GroupBy` key with the `System.Linq.Expressions` API, and Entity Framework Core translates the result into parameterized SQL:

```csharp
// s => new GroupKey { I0 = s.OrderYear, S1 = s.SalesTerritoryCountry, ... }
var sale = Expression.Parameter(typeof(Sale), "s");
var bindings = dimensions.Select((dimension, index) =>
{
    var value = Rebind(dimension.Selector, sale);
    return Expression.Bind(
        DimensionSlot(dimension, index).Property,
        dimension.IsNumeric ? Expression.Convert(value, typeof(int?)) : value);
});
return Expression.Lambda<Func<Sale, GroupKey>>(
    Expression.MemberInit(Expression.New(typeof(GroupKey)), bindings), sale);
```

The measures go the same way: only the requested aggregates are bound into the result row, so a request for revenue does not count distinct orders as well.

If you know [Dynamic LINQ](https://dynamic-linq.net/), this looks familiar: both build expression trees at runtime.
The difference matters here: Dynamic LINQ *parses strings* such as `"new(OrderYear, Country)"`.
That is convenient, but it puts an expression parser into the path between the LLM and the database, and versions before 1.3.0 had a [remote code execution vulnerability](https://github.com/advisories/GHSA-w65q-jcmv-28gj) (CVE-2023-32571) in exactly that parser.
Our approach only combines lambdas that were compiled together with the backend. There is nothing to parse.
The price is a little more code.

### Node.js: Drizzle

In NestJS, [Drizzle](https://orm.drizzle.team/) plays the same role.
The views are declared as existing views, and the dimensions point to Drizzle columns:

```ts
{ name: 'country', label: 'Country', description: 'Country of the sales territory.', isNumeric: false, isTime: false, listValues: true, column: sales.salesTerritoryCountry },
```

Each measure carries its SQL fragment, built with Drizzle's `sql` template tag, so columns are interpolated by Drizzle and nothing is concatenated as text:

```ts
{
  name: 'margin', label: 'Gross margin', description: 'Revenue minus product cost.', unit: 'USD',
  sql: sql<number>`round(coalesce(sum(${sales.salesAmount}), 0) - coalesce(sum(${sales.totalProductCost}), 0), 2)`.mapWith(Number),
},
```

### Two Backends, One Contract

Both backends serve the same HTTP contract: `GET /api/schema`, `POST /api/sales/aggregate`, plus a small product catalogue with photos.
Errors are [RFC 9457 problem details](https://www.rfc-editor.org/rfc/rfc9457) in both.

Each backend generates an [OpenAPI](https://www.openapis.org/) 3.1 document from its own code: ASP.NET Core from its endpoints and records, NestJS from its controllers and DTO (data transfer object) classes.
Open a backend's port in the browser, and you land in Swagger UI: <http://localhost:8081> for .NET, <http://localhost:8082> for Node.
Start both, and the two pages show the same endpoints, the same schemas and the same types.

"The same contract" is easy to claim, so the repository contains contract tests.
One test compares the two OpenAPI documents: paths, parameters, request and response schemas with their types, required fields and enums; only descriptions and examples may differ.
The other tests send the same requests to both backends and compare the answers.
They found two differences that would otherwise have been subtle bugs:

- **Sorting of NULL values.** SQL Server puts NULLs first in ascending order, PostgreSQL puts them last. The Node backend says `nulls first` / `nulls last` explicitly.
- **Rounding.** SQL Server's `money` type has four decimal places. Both backends round amounts to cents.

With a safe and stable data API in place, the agent can use it.

## Layer 3: The Agent, with Mastra or the Microsoft Agent Framework

The agent is the part that talks to the model.
It has a system prompt, two backend tools (`querySales` for the semantic layer, `findProducts` for the product catalogue), and the frontend adds a third one later.
On path A, it lives in the backend: Mastra in NestJS, the Microsoft Agent Framework in ASP.NET Core.

| Agent (Node.js track) | Mastra |
| --- | --- |
| What it is | A TypeScript framework for agents: tools with schemas, the agent loop, a model router for many providers, plus workflows, memory, evals and observability that this demo does not need |
| Made by | Kepler Software, Inc. in San Francisco, founded by people from the Gatsby team, Y Combinator Winter 2025; version 1.0 since January 2026. Apache 2.0, except the `ee/` folders |
| Why we need it | It runs the loop between model and tools, validates the tool arguments, and speaks AG-UI through the adapter `@ag-ui/mastra` |
| Alternatives | Vercel AI SDK, LangGraph, OpenAI Agents SDK, Google ADK, AWS Strands Agents |

| Agent (.NET track) | Microsoft Agent Framework |
| --- | --- |
| What it is | Microsoft's framework for agents in C#, Python and Go (preview): agents from any `IChatClient` (the provider-neutral chat interface of Microsoft.Extensions.AI), tools from plain C# methods, workflows, memory and hosting for ASP.NET Core |
| Made by | Microsoft, MIT license; [the direct successor of Semantic Kernel and AutoGen](https://learn.microsoft.com/en-us/agent-framework/overview/), "created by the same teams" |
| Why we need it | It runs the loop between model and tools in the ASP.NET Core process and serves AG-UI with `MapAGUIServer()` |
| Alternatives | The plain `IChatClient` of `Microsoft.Extensions.AI` with your own loop, Semantic Kernel (its predecessor), or path B with Mastra |

### Who Makes Mastra?

[Mastra](https://mastra.ai/) is made by Kepler Software, Inc., a company from San Francisco.
Its founders [built Gatsby](https://www.ycombinator.com/companies/mastra), the React web framework, before they started on Mastra in October 2024.
Mastra went through Y Combinator in Winter 2025 and [released version 1.0 in January 2026](https://mastra.ai/blog/announcing-mastra-1).
Manfred uses Mastra in his workshop, too.

For a TypeScript developer, Mastra feels familiar: tools are objects with a [Zod](https://zod.dev/) schema, agents are objects with instructions, tools and a model, and everything is plain TypeScript.
The framework is Apache 2.0, with one exception: everything in folders named `ee/` (enterprise features such as parts of the authentication) is under a separate, source-available license that does not allow production use without a contract. Our demo does not use those parts.

### Tools Generated from the Semantic Layer (Mastra)

The agent builds its tool schemas from the semantic layer, the same data that `GET /api/schema` returns.
Dimension and measure names become enums in Zod. The model sees exactly the names that exist, and Mastra rejects any other name before the tool runs:

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
  execute: ({ query }) => orError(() => data.aggregate(query)),
});
```

`data.aggregate` is the NestJS service of the semantic layer, called in the same process.
`orError()` turns every failure into a tool result instead of an exception: `{ error: 'Unknown dimension …' }` or `{ error: 'The database is not reachable.' }`.
The model can correct a rejected request or tell the user what went wrong, and the chat never hangs.

The system prompt contains the dataset description, all dimensions with their allowed values, and a few rules.
The most important one:

```text
- Personal data is not part of the data model: no sales representatives or key account managers,
  no contact persons, no customers as persons. If asked, say that this data is deliberately not
  available to you and offer an analysis at company, product or region level instead.
```

Note the order: the database guarantees that the data is not there, the prompt only makes sure the agent explains it politely.

### The Same Tools in C# (Microsoft Agent Framework)

In ASP.NET Core, a tool is a C# method.
`AIFunctionFactory` from `Microsoft.Extensions.AI` turns it into a tool: the name, the `[Description]` attributes and a JSON schema derived from the parameter types.
The query parameter is the same `AggregateRequest` record that `POST /api/sales/aggregate` accepts:

```csharp
[Description("Aggregates the sales data and shows the result to the user as a chart, table or key figure. ...")]
async Task<object> QuerySales(
    [Description("Short title for the visualization.")] string title,
    ChartKind chart,
    AggregateRequest query,
    CancellationToken ct) =>
    await OrError(() => aggregator.AggregateAsync(query, ct));

AITool[] tools =
[
    AIFunctionFactory.Create(QuerySales, Tool("querySales")),
    AIFunctionFactory.Create(FindProducts, Tool("findProducts")),
];

AIAgent analyst = new AnthropicClient { ApiKey = apiKey }
    .AsIChatClient("claude-sonnet-5-5")
    .AsAIAgent(name: "analyst", instructions: Instructions(schema), tools: tools);
```

The model comes in as an `IChatClient`, here from Anthropic's official .NET SDK; other providers bring their own.
The system prompt is the same text as for Mastra, built from the same schema.

The enums are added while the JSON schema is generated: a callback sees every property and can change its schema node, much like the OpenAPI transformer that the backend already has.

```csharp
switch (context.DeclaringType?.Name, context.PropertyInfo?.Name)
{
    case (nameof(AggregateRequest), "measures"):
        node["items"] = new JsonObject { ["type"] = "string", ["enum"] = measureNames };
        break;
    case (nameof(FilterRequest), "dimension"):
        node["enum"] = dimensionNames;
        break;
    // groupBy, operator, direction, limits ...
}
```

Two details are easy to get wrong, and both show how much the model depends on the schema:

- **Enums need a string converter.** Without `[JsonConverter(typeof(JsonStringEnumConverter<ChartKind>))]`, the schema describes `ChartKind` as a number, and the model sends `"chart": 1` instead of `"chart": "line"`.
- **Optional is not nullable.** C# records with `string?` and `int?` become schema types like `["array", "null"]`. The model then sends `"filters": null`, and the Angular app, which checks every chart request against its own Zod schema (shown in layer 4) where `filters` is optional, rejects it. The callback therefore removes `null` from optional fields, so both agents describe exactly the same tool.

### Serving AG-UI

The browser posts the conversation, and the agent answers with AG-UI events as server-sent events.
This is what happens for one question:

![Sequence of one question: browser, agent, LLM, semantic layer](request-flow.svg "One question, step by step")

In **ASP.NET Core**, the AG-UI endpoint is one line, from the package `Microsoft.Agents.AI.Hosting.AGUI.AspNetCore`:

```csharp
builder.Services.AddAGUIServer();
// ...
app.MapAGUIServer("/agent/ag-ui/analyst", analyst);
```

In **NestJS**, the package `@ag-ui/mastra` translates the Mastra agent into an AG-UI agent, and a controller streams its events:

```ts
@Controller('agent')
export class AgentController {
  @Post('ag-ui/analyst')
  async run(@Body() body: unknown, @Res() reply: FastifyReply): Promise<void> {
    const input = RunAgentInputSchema.parse(body);
    const agent = new MastraAgent({
      agentId: 'analyst',
      agent: await this.getAnalyst(),
      threadId: input.threadId,
      initialMessages: input.messages,
      streamServerToolCalls: true,
    });

    const response = reply.hijack().raw;
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    await agent.runAgent(input, {
      onEvent: ({ event }) => response.write(`data: ${JSON.stringify(event)}\n\n`),
    });
    response.end();
  }
}
```

`RunAgentInputSchema` from `@ag-ui/core` checks the request body before the run starts.
Neither agent keeps a memory: CopilotKit sends the whole thread with every request.
For a demo, that is ideal: no conversation ends up in a database on the server.

### Mastra or the Agent Framework: Are They Equivalent?

Are the two equivalent? For this app, yes.
The Angular app does not know which framework answers; only the status line in the header shows it.
With the same model (Claude Sonnet 5.5), the same prompt and the same tools, both agents answered the example questions above the chat's input field in the same way.
The quarterly revenue per channel became a line chart, the Mountain-200 (a mountain bike in the AdventureWorks catalogue) became product cards, and the question about the key account manager got the polite refusal that [the test below](#test-who-is-the-key-account-manager) looks at in detail.
Pinning a chart by chat (a frontend tool, see layer 4) works with both, including the confirmation after the frontend tool has run.
The texts differ from run to run, as they do with the same framework, too.

That is no coincidence: both frameworks are built from the same parts.
An agent has instructions, tools and a model, a loop calls tools until the answer is complete, and the result streams to the browser over AG-UI.
Beyond what this demo uses, both also offer workflows with explicit steps, memory for conversations, MCP clients and telemetry.

What differs is the work around it:

| | Mastra | Microsoft Agent Framework |
| --- | --- | --- |
| Languages | TypeScript | C#, Python, Go (preview) |
| Model access | a model router: one string per model, e.g. `anthropic/claude-sonnet-5-5` | an `IChatClient` from Microsoft.Extensions.AI, created by the provider's SDK |
| Tool schema | written by hand in Zod | derived from C# types, adjusted in a callback (enums, optional without `null`) |
| Validation of tool arguments | Mastra checks against the Zod schema | deserialization into the C# types; names are checked by the semantic layer |
| AG-UI | adapter package plus a few lines of streaming | `MapAGUIServer()`, still a preview package |
| Trying agents locally | Mastra Studio, a local web UI | DevUI, a preview package |
| Origin | Kepler Software, 1.0 in January 2026 | Microsoft, direct successor of Semantic Kernel and AutoGen |
| License | Apache 2.0, except the source-available `ee/` folders | MIT |

So the choice follows your backend: a Node.js team takes Mastra, a .NET team the Agent Framework.
The differences that matter most are invisible at first: the defaults with which each framework talks to the model. The section [Fine-Tuning: Do Not Settle for the First Result](#fine-tuning-do-not-settle-for-the-first-result) shows how much they can change.
None of these differences is a reason to switch the backend language, and with path B you can even combine a .NET backend with a Mastra agent.

On the .NET side, the AG-UI hosting package is a preview (`1.27.0-preview`) at the time of writing, while the rest of the framework is stable.

### Choosing Another Agent Framework

Which framework fits depends mostly on your language and on whether it speaks AG-UI, because then the Angular side stays the same:

| Framework | Maker | Languages | AG-UI |
| --- | --- | --- | --- |
| [Mastra](https://mastra.ai/) | Kepler Software | TypeScript | yes, `@ag-ui/mastra` |
| [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/overview/) | Microsoft | C#, Python, Go (preview) | yes |
| [LangGraph](https://www.langchain.com/langgraph) | LangChain | Python, TypeScript | yes |
| [Vercel AI SDK](https://ai-sdk.dev/) | Vercel | TypeScript | yes, via `@ag-ui/vercel-ai-sdk` |
| [Google ADK](https://google.github.io/adk-docs/) | Google | Python, TypeScript, Go, Java | yes |
| [AWS Strands Agents](https://strandsagents.com/) | AWS | Python, TypeScript | yes |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/) | OpenAI | TypeScript, Python | in progress |
| [Pydantic AI](https://ai.pydantic.dev/) | Pydantic | Python | yes |

### Switching the Model

| Model | Claude, GPT or Gemini |
| --- | --- |
| What it is | The LLM that reads the conversation and decides which tool to call |
| Made by | Anthropic, OpenAI, Google, each with a commercial API |
| Why we need it | It turns a question in plain language into a structured query and comments on the result |
| Alternatives | Any provider with an SDK for your agent framework, or an open-weight model on your own hardware via Ollama or vLLM |

Mastra has a [model router](https://mastra.ai/models): the model is a single string like `anthropic/claude-sonnet-5-5`, `openai/gpt-5.6-terra` or `google/gemini-3-flash-preview`, and the API key comes from the provider's usual environment variable.
In the Microsoft Agent Framework, you swap the `IChatClient`: the demo's .NET backend creates one from Anthropic's SDK or, for `MODEL=openai/…`, from OpenAI's SDK through the package `Microsoft.Extensions.AI.OpenAI`.
Google and Mistral models run on the Node.js track only.
Either way, the setting is one line (`MODEL`) plus the provider's API key in `agent/.env`, which both backends and the separate agent service read.
How well the agent works depends on the model: it has to pick the right tool, fill the query schema correctly and stick to the rules of the system prompt.
Try your questions with two or three models before you decide.

### Pitfalls: Telemetry and Peer Dependencies

- **Mastra sends usage telemetry by default** to PostHog, including token usage of the agents ([source](https://github.com/mastra-ai/mastra/blob/main/packages/core/src/telemetry/posthog.ts)). The demo switches it off with `MASTRA_TELEMETRY_DISABLED=1`. Check this in your own projects; it is easy to miss. [Telemetry: Who Phones Home?](#telemetry-who-phones-home) lists every layer of the stack.
- **Peer dependencies pull in more than you need.** `@ag-ui/mastra` declares `@copilotkit/runtime` and `@mastra/client-js` as *peer dependencies* (packages it expects the app to provide), and npm installs those automatically. CopilotKit's runtime brings a long list of dependencies, including analytics packages. The demo needs neither, so it switches the automatic installation off (`legacy-peer-deps=true` in `.npmrc`) and lists the packages it uses itself. Manfred solves the same problem with an [empty stub package](https://github.com/manfredsteyer/agentic-sales/tree/main/agent/libs/copilotkit-runtime-stub).

The server side is complete. Now to the part where Angular developers feel at home.

## Layer 4: Angular with CopilotKit

| Frontend | CopilotKit for Angular |
| --- | --- |
| What it is | Chat components and APIs that connect an Angular app to an AG-UI agent and render tool calls as Angular components |
| Made by | CopilotKit (Tawkit, Inc.), a startup from Seattle founded in 2023 by Atai and Uli Barkai. MIT license. The Angular package `@copilotkit/angular` lives in the main repository and is at version 0.6, for Angular 22 |
| Why we need it | We get the chat, the streaming, and the binding between tool calls and our components, without writing an AG-UI client ourselves |
| Alternatives | Hashbrown, the Vercel AI SDK for Angular, an A2UI renderer, or your own AG-UI client. More on these below |

[CopilotKit](https://www.copilotkit.ai/) is not a Microsoft product; "Copilot" is a generic word here.
The libraries are open source under MIT. The company earns money with a commercial platform on top, which our demo does not use.
CopilotKit also started the AG-UI protocol, and its [Angular frontend](https://docs.copilotkit.ai/angular) is described as the "first-party, signal-based Angular frontend for AG-UI agents".

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
Manfred summed up the difference nicely: with `registerComponent()` and `registerFrontendTool()`, **the model decides** to show something; with `registerRenderToolCall()`, **CopilotKit decides** to draw the result of a backend tool.

| API | Who defines the tool? | What happens? |
| --- | --- | --- |
| `registerComponent()` | the frontend | The model calls the tool *to show* the component and passes the data as arguments. |
| `registerFrontendTool()` | the frontend | The model calls the tool, the handler runs in the browser (and may render a component). |
| `registerRenderToolCall()` | the agent | A backend tool runs; the frontend only *draws* its arguments and result. |

All three are controlled generative UI in the sense of the table above: the components are ours, the agent only chooses and fills them.

Our charts use `registerRenderToolCall()`.
The tool runs on the server, and the component receives the arguments (title, chart type, query) and the result (the rows).
The model does not have to repeat the numbers as component arguments, which saves tokens and avoids transcription errors.

```ts
@Component({
  selector: 'app-sales-view-renderer',
  imports: [SalesChart],
  template: `
    @let call = toolCall();
    @if (result(); as result) {
      @if (view(); as view) {
        <app-sales-chart [title]="view.title" [kind]="view.chart" [result]="result" />
        <button type="button" [disabled]="pinned()" (click)="dashboard.pin(view)">Pin to dashboard</button>
      }
    } @else if (error(); as error) {
      <p class="error"><strong>No result.</strong> {{ error }}</p>
    } @else {
      <p class="loading">{{ call.args.title ?? 'Querying sales' }} …</p>
    }
  `,
})
export class SalesViewRenderer implements ToolRenderer<SalesView> {
  readonly toolCall = input.required<AngularToolCall<SalesView>>();
  // view(), result(), error(), pinned() are computed signals over toolCall()
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
When the call is complete, `result` holds the tool's answer as a JSON string: either the rows, or an error message from `orError()` or from Mastra's schema check, which the card shows instead of the chart.

Pinning works both ways: by button, and by asking the agent ("Please pin that chart to the dashboard").
For the second, the frontend registers a tool that runs in the browser.
CopilotKit sends its name and schema to the agent with every request. When the model calls it, CopilotKit runs the handler in the browser and starts a follow-up run with the handler's answer, so the model can confirm it:

```ts
registerFrontendTool({
  name: 'pinToDashboard',
  description: 'Pins a view to the dashboard next to the chat. Only when the user asks for it.',
  parameters: salesViewSchema,
  handler: async (view) => {
    // CopilotKit passes the model's arguments as parsed JSON, without checking them against the schema.
    const parsed = salesViewSchema.safeParse(view);
    if (!parsed.success) return `Not pinned, the view is invalid: ${parsed.error.message}`;
    return dashboard.pin(parsed.data)
      ? `Pinned "${parsed.data.title}" to the dashboard.`
      : 'This view is already on the dashboard.';
  },
});
```

The handler validates again, and that is a trap worth knowing: the Zod schema describes the tool for the model, but CopilotKit does not validate the arguments.
Without the check, a single malformed pin is stored as is, and on the next page load, the dashboard validates the tiles it stored in `localStorage` and discards *all* of them.
**Treat everything the model sends as untrusted input**, just like a form submitted from the internet.

### Charts: Label What Is Plotted

The charts are plain Angular components (bars in HTML and CSS, lines in SVG) with tooltips, a legend for several series, a colour palette that works for colour-blind readers, and a switch to a table view.
No chart library is needed for that.

A typical trap in generative UI: ask for "the gross margin of the product categories in Europe in 2013", and the model requests revenue *and* margin and titles the chart "Gross margin by product category".
A chart that simply plots the first measure then shows revenue under a margin title, while the text answer below is correct.

Two things prevent that here: the tool description tells the model that the first measure is plotted, and the chart does not guess.
Measures with the same unit are drawn side by side, and the chart always says what it shows ("Revenue (USD)", "Values (USD)"), taken from the query and not from the title.

The text answer below the chart is a different matter: the numbers in the chart come from the database, while the short analysis comes from the model and can misstate a number or see a trend that is not there. Nothing checks it, so the chart is what counts.

### Dashboard: Running Without the Model

A pinned tile is a `SalesView`: title, chart type, query.
It is stored in `localStorage`, so in the demo each browser has its own dashboard; a real project would store the views on the server per user or team. Each tile is loaded with `httpResource()` directly from the backend:

```ts
protected readonly data = httpResource<AggregateResponse>(() => ({
  url: '/api/sales/aggregate',
  method: 'POST',
  body: this.tile().query,
}));
```

Manfred calls this the difference between *design mode* and *runtime mode*: the agent helps to design the view once, and from then on it runs like any other report.

### Alternatives to CopilotKit

CopilotKit is not the only way to bring an agent into an Angular app.
These are the options I would look at:

| Library | Maker, license | Frameworks | How it works |
| --- | --- | --- | --- |
| [CopilotKit](https://docs.copilotkit.ai/angular) | CopilotKit, MIT | Angular, React, Vue | Chat and tool rendering for an agent on the server, over AG-UI |
| [Hashbrown](https://hashbrown.dev/) | LiveLoveApp, MIT | Angular, React | Headless: the model renders your registered components and calls tools that run in the browser. A thin server adapter keeps the API key and streams AG-UI events |
| [Vercel AI SDK UI](https://ai-sdk.dev/docs/getting-started/angular) | Vercel, Apache 2.0 | React, Vue, Svelte, Angular (`@ai-sdk/angular`) | Chat state and streaming for a backend built with the AI SDK; no ready-made chat components for Angular |
| [A2UI renderer](https://github.com/a2ui-project/a2ui) | started by Google, Apache 2.0 | Angular, Lit, React, Flutter | Renders declarative UI descriptions from the agent with your component catalogue; needs a transport such as AG-UI |
| [assistant-ui](https://www.assistant-ui.com/) | AgentbaseAI, MIT | React | Chat components for React with an AG-UI adapter; for Angular teams only relevant in a React micro-frontend |
| Your own AG-UI client | you | any | `@ag-ui/client` plus a few signals; you write the chat UI yourself |

The main difference is where the agent lives.
Hashbrown runs the agent loop in the browser: tools have direct access to your services and state, and the server only holds the API key.
CopilotKit connects the Angular app to an agent on the server.
That is the right choice when tools need database access that must never reach the browser, as in our demo.

The Angular team itself does not offer a chat or generative UI library; [angular.dev/ai](https://angular.dev/ai) points to Genkit, Firebase AI Logic and the Gemini API for AI features.

One thing to plan for: CopilotKit is not small.
It brings Markdown rendering, syntax highlighting, KaTeX and web components, and the initial bundle of the demo is about 1.5 MB compressed.
In my opinion, that is fine for an internal analytics tool, but not for a public landing page.

With that, the app is complete on path A. Before we move the agent into its own service, two things that help you understand and tune it: a window into the traffic, and a look at how much small settings change the result.

## Watching the Traffic

For learning, the most useful part of the demo is a debug feature: below the chat and the dashboard, a traffic window shows every message on both connections, in two tabs:

- **Browser ↔ agent (AG-UI):** the `RunAgentInput` that the browser posts, with the whole conversation and the frontend tools, and every event that comes back: `RUN_STARTED`, the tool call arriving piece by piece in `TOOL_CALL_ARGS`, the result (`TOOL_CALL_RESULT`), the pieces of text (`TEXT_MESSAGE_CONTENT`) and `RUN_FINISHED`.
- **Agent ↔ LLM provider:** the request in the provider's own format, with the system prompt, the tool schemas and the tool results, and the streamed answer. This is what the model really gets, including the defaults that the framework adds.

![The traffic window below the chat: the AG-UI events of one run, with the product cards it produced above](traffic-window.png "Browser ↔ agent: the findProducts call arrives piece by piece, its result becomes the product cards.")

![The second tab: the request to Anthropic with model, token limit and the system prompt](traffic-llm.png "Agent ↔ LLM provider: the request as Anthropic receives it, starting with the system prompt.")

Each part is built in the language of its layer:

- **Angular:** `HttpAgent` accepts a `fetch` function. The demo's version passes the request through unchanged and reads a copy of the event stream (`ReadableStream.tee()`).
- **Node.js:** a small proxy on a free port of 127.0.0.1, in the same process. The provider SDKs read their address from `ANTHROPIC_BASE_URL` and `OPENAI_BASE_URL`, so pointing these at the proxy is enough, and the agent code stays unchanged. The proxy forwards each request to the address that was configured before, so the EU endpoint of OpenAI works with the window, too.
- **.NET:** the Anthropic SDK accepts `DelegatingHandler`s for its HTTP pipeline (`Handlers` on the client), and OpenAI's SDK accepts an `HttpClient` as its transport. The same handler sits in both: it records the request body and the streamed answer while passing both through.

Headers, and with them the API key, are never recorded.

> **Debug feature, not for production.** The window shows the system prompt, every tool result and the whole conversation to whoever opens the app. It is on by default because the demo is meant for learning. Switch it off with `DEBUG_TRAFFIC=off`, and remove everything marked `DEBUG ONLY` from a production application.

The window pays off quickly.
In every answer from Anthropic, the `usage` block contains `"inference_geo": "global"`.
According to [Anthropic's documentation](https://platform.claude.com/docs/en/manage-claude/data-residency), that is the default, and it means that "inference may run in any available geography".
The only alternative is `"us"`; there is no EU option on Anthropic's own API at the time of writing.
That is exactly the kind of detail your data protection officer will ask about, and one you would never see in the chat. [What Goes to the LLM Provider?](#what-goes-to-the-llm-provider) shows the way out.

## Fine-Tuning: Do Not Settle for the First Result

When the demo ran for the first time, both agents gave good answers, and it would have been easy to stop there.
But an agent has many switches, and several of them change the result considerably: the wording of the system prompt, the tool descriptions, which tools are offered, how tool results are serialized, the token limit and of course the model.
Some of these switches you set yourself.
Others are defaults of the framework or the SDK that you never see unless you look at the request that actually goes to the provider.
So take the time to try the same question many times and with small changes before you trust the result.

### Example: The Answer Language

The system prompt contained a well-meant rule: "Answer in the language of the user's latest message."
With the Agent Framework, every third or fourth answer to an English question came back in German, with German date formats like 29.12.2010.
Nothing in the request was German.
With Mastra, the same prompt did not produce a single German answer in my runs.

Did Mastra add a hidden instruction?
To find out, I recorded what both agents send to the Anthropic API, the same way the [traffic window](#watching-the-traffic) does.
The answer: no hidden prompt. The system prompt was identical, character for character.
The differences were in the details:

| | Mastra | Microsoft Agent Framework |
| --- | --- | --- |
| Output limit (`max_tokens`) | 128,000 | 1,024, the default of Anthropic's `IChatClient` adapter when the request sets no limit |
| Tool results | compact JSON | indented JSON, written with the default options of Microsoft.Extensions.AI |
| Tool definitions | from the Zod schemas | generated from the C# types |

Then I sent the recorded requests straight to the API, changed one detail at a time, and repeated each variant 24 times.
With the language rule, the share of German answers ranged from none to four out of five, depending on details that have nothing to do with language: whether the frontend tool was in the list, whether the query had a sort order, how the JSON was indented.
Mastra's request happened to land on the safe side, the Agent Framework's did not.
Give Mastra's request the tool definitions, the indented JSON and the token limit of the Agent Framework, and it answers in German just as often.
So this is not a weakness of one framework: the rule itself made the model unstable, and the framework details only decided how often it showed.
Why the model picks German of all languages is unknown.

The solution was to delete the rule.
Without it, in my runs both agents answered every English question in English and every German or Spanish question in German or Spanish.
Current models do this by themselves, and the rule only added a way to get it wrong.

The .NET agent keeps two of the changes anyway.
Tool results go to the model as compact JSON, which saves tokens, and the agent sets its own output limit, because 1,024 tokens can cut off a longer answer:

```csharp
AIFunctionFactoryOptions Tool(string name) => new()
{
    Name = name,
    SerializerOptions = Json,
    JsonSchemaCreateOptions = schemaOptions,
    MarshalResult = (result, type, _) => new(JsonSerializer.Serialize(result, type ?? typeof(object), Json)),
};

return model
    .AsBuilder()
    .ConfigureOptions(options => options.MaxOutputTokens ??= 8192)
    .Build()
    .AsAIAgent(name: Id, instructions: Instructions(schema), tools: tools);
```

What I take from this:

- **Look at the real request.** What the framework sends is not what you wrote. Defaults like the token limit or the JSON format only show up there.
- **One run says nothing.** Ask the same question many times and change one thing at a time. A behaviour that shows up in every fourth answer slips through a quick manual test.
- **Fewer rules are often better.** Every rule in the prompt is something the model can misapply. Keep the rules that the model cannot know by itself, such as the ones about personal data.

That completes path A. What changes when the agent gets its own service?

## Path B: The Agent as a Separate Service

Path B moves the agent out of the backend into its own Node.js service.
The demo contains it in the folder `agent/`: the same Mastra agent, the same prompt, the same tools.
Only two things change.

First, the tools call the backend's HTTP API instead of a service in the same process, and the agent loads the semantic layer at startup from `GET /api/schema`.
That works with both backends, because they share one contract:

```ts
const schema = await dataApi.schema();   // GET /api/schema, retried until the backend is up

execute: ({ query }) => orError(() => dataApi.aggregate(query)),   // POST /api/sales/aggregate
```

Second, the service needs its own small HTTP server for AG-UI. A plain `node:http` server with the same `MastraAgent` code as in the NestJS controller is enough.

The browser still talks to one origin: the web server in front of the app forwards `/agent` to the agent service and `/api` (dashboard tiles, photos) directly to the backend.
In the demo, one more Compose profile and one variable switch to path B:

```bash
AGENT_URL=http://agent:4111 docker compose --profile dotnet --profile agent up
```

Manfred's workshop uses this path, too: his agent runs on Mastra's own server next to an aggregation server.
For a workshop with interchangeable backends, path B is handy. In a customer project with one backend, I would start with path A.

## Test: Who Is the Key Account Manager?

Time for the question the whole data layer was built for.
The chat offers a few example questions above the input field. One of them is "Who is the key account manager of our biggest reseller?":

![The agent declines to name the key account manager and offers to look up the biggest reseller instead](key-account-manager.png "Company names yes, people no: the polite refusal from the system prompt.")

The wording changes from run to run, the content does not: no names of people, but an offer to analyse the reseller as a company.
In some runs, the agent went on right away, called `querySales`, showed the top 10 resellers as a bar chart, and named the biggest one: Brakes and Gears, with $877K from 12 orders.
That is exactly the line we drew: **company names yes, people no.**
And if the model had tried anyway, there would have been nothing to find.

## What Goes to the LLM Provider?

Here are all the protections in one picture, from the database at the bottom to the prompt at the top:

![Six layers keep personal data out: database account, views, row-level security, semantic layer, tool schema, system prompt](protection.svg "Only the top layer depends on the model.")

The protection has limits, and you should know them.

- **Everything a tool returns goes to the LLM.** The aggregated rows, the product names, the reseller names. The semantic layer and the views decide what that is. That is why personal data must be kept out *before* the model instead of being filtered *after* it.
- **Product photos do not.** The product cards load the images directly from the backend; the model only sees product keys and names.
- **The dashboard does not.** Pinned tiles never touch the model.
- **The browser talks to one origin only.** The app loads no fonts, scripts or telemetry from third parties, and the CopilotKit Inspector (which [reports usage](https://github.com/CopilotKit/CopilotKit/blob/main/packages/web-inspector/src/lib/telemetry.ts) when opened) is disabled.
- **Removing a column does not prevent every inference.** In AdventureWorks, only two to six sales representatives sold in each region, and in Germany only two. Anyone who knows who looks after the German bike shops gets very close to their figures with "revenue per country", although the system knows nothing about them. In a real project, agree on the granularity with your data protection officer and the works council: suppress small groups, use coarser regions, or leave a dimension out entirely. Technically, that is the same principle as the views: what is not in the semantic layer cannot be asked for. Only this time it applies to the dimensions instead of the columns.

For real customer data, you also need a data processing agreement (in Germany: an *Auftragsverarbeitungsvertrag*, AVV) with the LLM provider, and the data should be processed in Europe.
Here the providers differ a lot at the time of writing:

- **Anthropic's own API cannot process data in Europe.** [`inference_geo`](https://platform.claude.com/docs/en/manage-claude/data-residency) knows only `"global"` (the default, "any available geography") and `"us"`. Claude models can run in EU regions through Amazon Bedrock, but then AWS is your contract partner, not Anthropic.
- **OpenAI offers [data residency in Europe](https://developers.openai.com/api/docs/guides/your-data)** (EEA and Switzerland) with storage *and* inference in the region, through the endpoint `eu.api.openai.com`. It is a contract option: you need an EU project, an arrangement such as Zero Data Retention, and a talk with OpenAI's sales team, and it costs a surcharge for newer models.
- **Mistral AI** is a French company. Its [EU endpoint](https://docs.mistral.ai/inference/regional-inference) `api.eu.mistral.ai` keeps inference in the EU and EFTA countries; the default endpoint `api.mistral.ai` makes no promise about the location. Function calling works on the regional endpoint, and that is all this agent needs. Mistral's own Agents API, batch processing and file uploads are not available there, and account data, keys and billing are not regional.

So for an analytics tool with real company data in a German company, I would point you to OpenAI's models in the EU region today: a clean AVV with processing on European servers is much easier to get there.
A company I work for chose OpenAI over Anthropic for exactly this reason.
In the demo, that is configuration only: `MODEL=openai/…`, the API key, and `OPENAI_BASE_URL=https://eu.api.openai.com/v1`.
Mastra reads these settings on the Node.js track, and the .NET track reads the same three and takes its `IChatClient` from OpenAI's SDK.

Let's be honest about what the European server buys you, though.
OpenAI and Anthropic are US companies, and the US [CLOUD Act](https://www.law.cornell.edu/uscode/text/18/2713) obliges US providers to hand over data on request "regardless of whether such communication, record, or other information is located within or outside of the United States".
Where the server stands does not change who can access the data.
Neither company is listed in the [EU-U.S. Data Privacy Framework](https://www.dataprivacyframework.gov/list) at the time of writing, so transfers rest on standard contractual clauses.
What the EU region does change is the paperwork: processing in Europe is what data protection officers, works councils and procurement departments ask for, and it is far easier to document and defend.
In practice, that is often what decides the choice of provider.
If you need more than that, look at providers without US ties.
Mistral is the obvious candidate: a European company with an EU endpoint.
Check its list of subprocessors, though: if a US cloud runs the data centres, the same question comes back one level lower.
The safest option remains an open-weight model on your own hardware: then no data leaves your servers at all.

Mistral works with the demo's Node.js track, too.
Mastra's model router knows the provider, so `MODEL=mistral/mistral-large-latest` and `MISTRAL_API_KEY` are enough for the default endpoint.
For the EU endpoint, Mastra accepts a model object with its own address instead of the string, `{ id: 'mistral/mistral-large-latest', url: 'https://api.eu.mistral.ai/v1', apiKey }`, and then talks to it as an OpenAI-compatible API.
As with every model change, try your questions first: the model has to fill the tool schemas reliably.

## Telemetry: Who Phones Home?

The LLM provider is not the only one that receives data.
Several of the tools in this stack report usage to their makers, and some of them do it by default.
In a German company, leaving that on is not an option for me.
Every report goes to a third party, often outside the EU, and it quickly raises questions that you do not want to answer for an internal tool: what exactly is sent, on what legal basis, and who processes it?
So all telemetry must be off before the app touches real data.

Here is every layer of the demo and what it does:

| Layer | Telemetry | How to switch it off |
| --- | --- | --- |
| Angular, CopilotKit for Angular, AG-UI client | none from the app at runtime; the browser talks to its own origin only | – |
| CopilotKit Inspector | reports usage when opened | `enableInspector: false` (the demo does) |
| CopilotKit runtime (not used by the demo) | usage events to Segment | `COPILOTKIT_TELEMETRY_DISABLED=true` or `DO_NOT_TRACK=1` |
| Angular CLI | usage data only after you opt in | `"analytics": false` in `angular.json` (the demo does), or `ng analytics disable` |
| Mastra | usage telemetry to PostHog, **on by default** | `MASTRA_TELEMETRY_DISABLED=1` (the demo does) |
| Microsoft Agent Framework, Microsoft.Extensions.AI | none; OpenTelemetry only if you add it, and only to the exporter you configure | – |
| Anthropic SDKs | none; OpenTelemetry in the .NET SDK only on request | – |
| NestJS, Drizzle, postgres.js, ASP.NET Core, EF Core | none | – |
| .NET CLI (`dotnet restore`, `build`, `publish`) | usage data to Microsoft, **on by default**, [including](https://learn.microsoft.com/en-us/dotnet/core/tools/telemetry) three octets of the IP address and a hashed MAC address | `DOTNET_CLI_TELEMETRY_OPTOUT=1` (the demo's Dockerfile does) |
| `swagger-ui-dist` | depends on `@scarf/scarf`, which reports the install from a `postinstall` script | `ignore-scripts=true` in `.npmrc` (the demo does) or `SCARF_ANALYTICS=false` |
| Swagger UI | sends the URL of the OpenAPI document to validator.swagger.io when it is not served from localhost | `validatorUrl: null` (the demo does; Swashbuckle does it by default) |
| PostgreSQL | none | – |
| SQL Server | usage and diagnostic data to Microsoft; according to Microsoft without table contents or personal data | only in paid editions: `telemetry.customerfeedback = false`. The free Developer edition that the demo uses cannot switch it off |

SQL Server is acceptable here because it only holds the sample data and only serves the demo.
For production, the .NET track works just as well with a paid edition and telemetry off.

Two habits help with every new package:

- **Search the package for telemetry before you install it.** Words like `telemetry`, `posthog`, `segment` or `scarf` in its source and a `postinstall` script in its `package.json` are the usual signs.
- **Watch the network.** The browser's developer tools show every request of the app; on the server, the [traffic window](#watching-the-traffic) shows only the requests to the LLM provider; to catch other outgoing connections, watch the network traffic of the containers.

## What This Demo Leaves Out

Manfred's workshop goes further in a few directions that I deliberately skipped:

- **Shared agent state** (AG-UI's `STATE_SNAPSHOT` and `STATE_DELTA`), where the agent itself edits the dashboard, e.g. "change every tile to a bar chart".
- **A2UI**, so the agent can assemble UI from a catalogue of components at runtime.
- **JSONata** as a sandbox in which the model can compute derived figures.
- **Human-in-the-loop** approvals for large queries.

If you want to see these, watch his recording and read his code. In my opinion, that is the natural next step after this article.

## Conclusion

Agentic analytics with Angular works today, and it works with the stacks we already use.
The technology choice looks confusing at first, but each piece has one job: the model decides, Mastra or the Microsoft Agent Framework runs the loop and the tools, AG-UI carries the events, CopilotKit draws them as Angular components, and the backend and the database decide what data exists at all.
Every piece can be replaced on its own.

Six architectural decisions make the app work:

1. **Put the agent where your team already works.** In the existing backend (path A), with the agent framework of its language, or as a separate service (path B) when several backends share it.
2. **Keep personal data out of the views**, enforced by the database, not by the prompt.
3. **Give the model a semantic layer instead of SQL.** Typed in C# or TypeScript, validated on the server.
4. **Let the agent call tools, and let Angular draw them.** CopilotKit and AG-UI do the plumbing.
5. **Treat model output as untrusted input**, and let components decide what is true.
6. **Pin the result** and run it without the model from then on.

The complete code with both backends and both paths is on GitHub: **[angular-schule/demo-agentic-analytics](https://github.com/angular-schule/demo-agentic-analytics)**.
Clone it, copy the two `.env.example` files, add your API key, run `docker compose --profile node up` or `docker compose --profile dotnet up`, open http://localhost:8080, and ask your own questions.
Many thanks to Manfred Steyer for the inspiring workshop!

How do you keep personal data away from your agents? I'm curious about your approaches, so let me know.

## Glossary

Many of these concepts have different names in different frameworks.
The first table explains the terms as this article uses them, the second one shows what the frameworks call them.

### Terms

| Term | Meaning | Also known as |
| --- | --- | --- |
| **LLM** (large language model) | The model that reads the conversation and writes the answer or a tool call | Model, chat model |
| **LLM provider** | The company whose API runs the model | Provider, model provider. Examples: Anthropic, OpenAI, Google, Mistral; or your own hardware via Ollama or vLLM |
| **Token** | The unit in which a model reads and writes text, a few characters each; the basis for billing and output limits | – |
| **System prompt** | Standing instructions that apply to the whole conversation | Instructions. OpenAI: also *developer* messages. In Microsoft.Extensions.AI, a message with `ChatRole.System` |
| **Tool** | A function described to the model by name, description and JSON schema | OpenAI: function tool. Anthropic: tool use, "also called function calling" |
| **Tool call** | The model's request to run a tool with certain arguments | OpenAI: function call. AG-UI: the events `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_RESULT` |
| **Backend tool** | A tool that runs on the server, next to the agent | Server-side tool. Not to be confused with Anthropic's *server tools* (see *Provider-run tool* below) |
| **Frontend tool** | A tool that the browser offers and runs, e.g. `pinToDashboard` | Client tool, client-side tool |
| **Provider-run tool** | A tool that the LLM provider runs on its own infrastructure, e.g. web search | Anthropic: server tools, as opposed to *client tools*, which run in your application (backend included). Vercel AI SDK: provider-executed tools |
| **Tool rendering** | The frontend draws a tool call and its result as a component | Tool call rendering |
| **Agent** | An LLM in a loop with tools and instructions | |
| **Agent framework** | A library that runs the loop, the tools, streaming and the model connection | Mastra, Microsoft Agent Framework, LangGraph, Vercel AI SDK, Google ADK and others |
| **Harness** | Everything around the model that keeps it on track: prompt, tool schemas, validation, limits | Manfred Steyer's term. The Agent Framework also ships a *Harness Agent*, an agent with planning, context compaction and tool approval built in |
| **Generative UI** | User interface that the agent's answer produces, beyond text | |
| **Shared state** | A data structure that agent and app both read and write | Agent state |
| **Human-in-the-loop** | The agent pauses until a person approves or answers | Tool approval |
| **AG-UI** | Protocol between app and agent: events over HTTP | Agent-User Interaction Protocol, started by CopilotKit, see [the protocols](#the-protocols-ag-ui-a2ui-mcp-and-a2a) |
| **A2UI** | Format for a declarative UI description | started by Google |
| **MCP** | Protocol between agent and external tools or data | Model Context Protocol, from Anthropic, now at the Linux Foundation |
| **A2A** | Protocol between agents | Agent2Agent, from Google, now at the Linux Foundation |
| **SSE** (server-sent events) | An HTTP response that stays open and delivers one event after another | Web standard (`EventSource`); AG-UI's HTTP client receives its events this way |
| **Semantic layer** | Fixed business vocabulary of measures and dimensions, translated into SQL by the backend | dbt: Semantic Layer, powered by MetricFlow. Cube: data model with cubes and views. Looker: LookML. Power BI: semantic model |
| **Measure** | A number that is aggregated with a fixed formula, e.g. revenue | The same in dbt, Cube, Looker and Power BI; dbt builds *metrics* on top of measures |
| **Dimension** | An attribute to group or filter by, e.g. year or country | The same in dbt, Cube and Looker; from dimensional modelling in data warehousing |
| **Text-to-SQL** | The LLM writes SQL itself | Also NL2SQL. This demo avoids it on purpose |
| **View** | A stored `SELECT` that the database offers like a table | SQL standard |
| **Row-level security** | The database decides per connection or user which rows exist | SQL Server: Row-Level Security with security policies (`CREATE SECURITY POLICY`). PostgreSQL: row security policies (`CREATE POLICY`). The demo filters inside the views instead |
| **Fail closed** | On a missing or broken configuration, the system denies access instead of allowing everything | Security term; the opposite is *fail open* |
| **API contract** | The machine-readable description of an HTTP API that both backends implement | OpenAPI |
| **Path A / path B** | Agent in the existing backend, or as a separate service | Terms of this article |

### Same Concept, Different Names

The same idea often has a different name in each framework, and sometimes the same name means different things.
A dash means that the framework has no name of its own for it or that this article does not use it.

| Concept | Mastra | Microsoft Agent Framework (.NET) | AG-UI | CopilotKit | Vercel AI SDK |
| --- | --- | --- | --- | --- | --- |
| **LLM** | `model`, a string like `anthropic/claude-sonnet-5-5` | `IChatClient` from Microsoft.Extensions.AI | – | – | `model` |
| **System prompt** | `instructions` | `instructions` | – | – | `instructions` |
| **Agent** | `Agent` | `AIAgent`, concretely `ChatClientAgent` | agent; `HttpAgent` on the client | agent | `ToolLoopAgent` |
| **Tool** | tool, `createTool()` | `AIFunction`, created with `AIFunctionFactory` | tool | – | tool, `tool()` |
| **Backend tool** | a tool with an `execute` function | backend tool | backend tool | *server tool* for its built-in agent, *backend tool call* for an external agent | server-side tool |
| **Frontend tool** | client tool (`clientTools`) | frontend tool | frontend tool, also client-defined tool | frontend tool, `registerFrontendTool()` | client-side tool |
| **Tool rendering** | – | backend tool rendering | backend tool rendering | tool call rendering, `registerRenderToolCall()` | – |
| **Generative UI** | – | tool-based and agentic generative UI | static and declarative generative UI | controlled, declarative and open-ended generative UI | the result of a tool call rendered as a component |
| **Shared state** | – | – | state, sent with `STATE_SNAPSHOT` and `STATE_DELTA` | shared state, agent state | – |
| **Human-in-the-loop** | `requireApproval` | `ApprovalRequiredAIFunction` | interrupts | `registerHumanInTheLoop()` | `toolApproval` |
| **Trying agents locally** | Mastra Studio | DevUI (preview) | – | – | – |

Two names are easy to mix up.
**"Server tool"** means a tool on your server in CopilotKit, but a tool that Anthropic runs on its own servers in the Anthropic API.
**"Client tool"** means a tool in the browser in Mastra, but any tool that runs in your application, the backend included, in the Anthropic API.
