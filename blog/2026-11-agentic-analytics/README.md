---
title: 'Agentic Analytics with Angular, Part 1: Architecture, and Keeping Personal Data Out'
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
  - Agentic Analytics
  - AG-UI
  - A2UI
  - MCP
  - A2A
  - Semantic Layer
  - Data Protection
  - GDPR
  - Row-Level Security
  - Telemetry
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
In this series, I build such an app with Angular, piece by piece, from the database up to the chat, with a backend in .NET or in Node.js, as you prefer.
If you have never built an app with an AI agent before, that is fine: the series explains every term on the way, introduces the protocols you will keep hearing about (AG-UI, A2UI, MCP, A2A), and names an alternative for every library we use.
And because this is a German blog at heart, we take a close look at the question that comes first in every real project here: **what happens to personal data?**

> **Agentic Analytics with Angular** is a series in four parts:
>
> 1. **Architecture, and keeping personal data out** (this article)
> 2. The backend, as you prefer: [.NET with the Microsoft Agent Framework](/blog/2026-11-agentic-analytics-dotnet) or [Node.js with Mastra](/blog/2026-11-agentic-analytics-node)
> 3. [Generative UI in Angular with CopilotKit](/blog/2026-11-agentic-analytics-angular)
> 4. [Compare, watch and fine-tune the agent](/blog/2026-11-agentic-analytics-in-practice)

This first part lays the foundation: the vocabulary, the protocols, the architecture, and the data layer that keeps personal data away from the model.

> The complete demo is on GitHub: [angular-schule/demo-agentic-analytics](https://github.com/angular-schule/demo-agentic-analytics).
> Copy `.env.example` to `.env`, and `agent/.env.example` to `agent/.env` with your API key (without it, a demo model answers by keywords, no LLM needed), run `docker compose --profile node up` (or `--profile dotnet`), and open http://localhost:8080.

## Contents

[[toc]]

## Where the Idea Comes From

The starting point was a free online workshop that [Manfred Steyer](https://www.angulararchitects.io/) gave for AI Poland on October 23, 2026: *Build an Agentic Analytics App with Angular* ([recording](https://ai-poland.pl/free-workshops/recordings), [code](https://github.com/manfredsteyer/agentic-sales)).
His demo combined Angular with [CopilotKit](https://www.copilotkit.ai/), the AG-UI protocol and the agent framework [Mastra](https://mastra.ai/), on an obfuscated Google Analytics sample dataset from BigQuery, loaded into DuckDB.

The core idea comes from there, and I thank Manfred for it: **with CopilotKit, the agent answers with Angular components**.
The chat is only the input channel; the result is the dashboard that the user and the agent build together.

This series takes the idea a good deal further, with its own demo:

- **Data:** a classic data warehouse (AdventureWorksDW) in SQL Server or PostgreSQL instead of an analytics export in DuckDB, and data about people that must never reach the model.
- **Backends:** two interchangeable stacks with one HTTP contract, ASP.NET Core with Entity Framework Core, or NestJS with Drizzle.
- **Agents:** Mastra and the Microsoft Agent Framework, inside the backend or as a separate service.
- **Data protection:** views without personal data, row-level security that fails closed, a semantic layer instead of text-to-SQL, and a close look at providers, processing in the EU and telemetry.
- **Models:** Claude, GPT, Gemini and Mistral, in both backends.
- **Practice:** a traffic window that shows every message, fine-tuning of the defaults, and tests that run without a model.

## What We Build

![The finished app: chat on the left, the pinned dashboard on the right](screenshot.png "Chat on the left, dashboard on the right. The dashboard tiles run without the LLM.")

On the left, the user chats with an agent.
The agent answers with **Angular components**: line and bar charts, stat tiles, tables, and product cards with photos.
Every chart can be pinned to the dashboard on the right.
A pinned tile stores only the *query*, not the numbers, and asks the database again on every visit, **without the LLM**.
That is fast, deterministic, and costs no tokens.
Below both, a [traffic window](/blog/2026-11-agentic-analytics-in-practice#watching-the-traffic) shows every message between browser, agent and LLM provider, so you can see what really goes over the wire.

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
Everything around the model that keeps it on track (prompt, tool schemas, validation, limits) is what Manfred calls the *harness*: when the model gets something wrong, that is where the engineers improve the app.

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

So how does it differ from AG-UI?
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
Google [launched it in April 2025](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/), and since June 2025 it has been a [Linux Foundation project](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents).
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
In this series, that is Mastra for NestJS and the Microsoft Agent Framework for ASP.NET Core.

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

This series follows **path A**, because one process is easier to host than two.
That gives us two tracks with the same Angular app on top:

- **Node.js track:** NestJS + Drizzle + PostgreSQL, with **Mastra** as the agent.
- **.NET track:** ASP.NET Core + Entity Framework Core + SQL Server, with the **Microsoft Agent Framework** as the agent.

Both agents get the same system prompt and the same two tools, so we can also see whether the two frameworks give similar results.
Path B has [its own section](/blog/2026-11-agentic-analytics-node#path-b-the-agent-as-a-separate-service) in the Node.js part of this series; the demo runs it with one more Compose profile.
For simplicity, the demo builds path B only once, with Mastra: a separate service talks HTTP and works in front of either backend, so a second agent service in C# would only repeat the same agent.

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
| Model | Claude, GPT, Gemini or Mistral | Anthropic, OpenAI, Google, Mistral AI | commercial API |

Throughout the series, a small table for each layer says what it is, who makes it, why we need it, and what you could use instead.

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
| Why we need it | It joins the warehouse into flat views and enforces two protections below the semantic layer: a read-only account and row-level security per connection |
| Alternatives | MySQL, MariaDB, DuckDB for local analytics, or a cloud warehouse such as BigQuery or Snowflake |

### Company Names: Yes. People: No.

Every reseller order in AdventureWorks has a sales representative: the **key account manager** for that bike shop.
In the warehouse, that is the column `FactResellerSales.EmployeeKey`, and behind it in `DimEmployee` are the name, email address, phone number, hourly rate, birth date and even a photo.

From the point of view of the GDPR (General Data Protection Regulation), the distinction is clear:

- **The name of a company is not personal data.** The GDPR protects natural persons and, according to [recital 14](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679), does not cover the name and contact details of a legal person. "Brakes and Gears bought for $877,107" is a business fact. Be careful with sole traders, whose company name is often their own name.
- **The name of a key account manager is personal data.** And as soon as we can group revenue by sales representative, we have built a performance evaluation of individual employees, and the works council will want to have a word about that.

So the rule for our app is: **the agent may analyse resellers, but never the people behind the sales.**
The same applies to online customers, who are private persons.

A prompt ("please don't talk about employees") cannot enforce this. The semantic layer can (layer 2 below): it offers no dimension for sales representatives or customers, so the model has no way to ask for them.
What the semantic layer does not list cannot be queried.

### Views: The Warehouse as Flat Tables

The warehouse spreads a single order line over a fact table and half a dozen dimension tables, and the two sales channels even have separate fact tables.
We create a schema `analytics` with three views that join all this into flat, *denormalized* tables: the sales lines of both channels in one table, the resellers, and the products.
That is their main job in this demo.
Both backends map three flat tables instead of ten, and every dimension of the semantic layer points to exactly one column.

On the way, the views leave out the people: they contain **no reference to a natural person**, not even as a key:

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
This enforces the rule about people a second time, in the database: a dimension "sales representative" would not be one more line in the backend, but a change to the database that someone has to make on purpose.
This extra layer is optional.
If your team does not manage the database, or the effort is not worth it, the semantic layer alone keeps people away from the model, as long as none of its dimensions points to them.

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

Flat views and a read-only account are a good basis for queries. But they do not stop a model from writing arbitrary SQL against them.

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

With a safe and stable data API in place, the agent can use it. Part 2 shows in detail how your backend of choice builds the semantic layer.

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

Part 2 builds this agent, in the stack of your choice. Before that, two questions that every data protection officer asks about such an app: what does the LLM provider receive, and which tool reports to its maker?

## What Goes to the LLM Provider?

Here are all the protections in one picture, from the database at the bottom to the prompt at the top:

![Six layers keep personal data out: database account, views, row-level security, semantic layer, tool schema, system prompt](protection.svg "Only the top layer depends on the model.")

The protection has limits, and you should know them.

- **Everything a tool returns goes to the LLM.** The aggregated rows, the product names, the reseller names. The semantic layer and the views decide what that is. That is why personal data must be kept out *before* the model instead of being filtered *after* it.
- **Product photos do not.** The product cards load the images directly from the backend; the model only sees product keys and names.
- **The dashboard does not.** Pinned tiles never touch the model.
- **The traffic window is a debug feature.** It shows the whole conversation and every tool result to whoever opens the app. It is on by default for learning; switch it off with `DEBUG_TRAFFIC=off` in `agent/.env`.
- **The browser talks to one origin only.** The app loads no fonts, scripts or telemetry from third parties, and the CopilotKit Inspector (which [reports usage](https://github.com/CopilotKit/CopilotKit/blob/main/packages/web-inspector/src/lib/telemetry.ts) when opened) is disabled.
- **Removing a column does not prevent every inference.** In AdventureWorks, only two to six sales representatives sold in each region, and in Germany only two. Anyone who knows who looks after the German bike shops gets very close to their figures with "revenue per country", although the system knows nothing about them. In a real project, agree on the granularity with your data protection officer and the works council: suppress small groups, use coarser regions, or leave a dimension out entirely. Technically, that is the same principle as for the people: what is not in the semantic layer cannot be asked for.

For real customer data, you also need a data processing agreement (in Germany: an *Auftragsverarbeitungsvertrag*, AVV) with the LLM provider, and the data should be processed in Europe.
Here the providers differ a lot at the time of writing:

- **Anthropic's own API cannot process data in Europe.** [`inference_geo`](https://platform.claude.com/docs/en/manage-claude/data-residency) knows only `"global"` (the default, "any available geography") and `"us"`. Claude models can run in EU regions through Amazon Bedrock, but then AWS is your contract partner, not Anthropic.
- **OpenAI offers [data residency in Europe](https://developers.openai.com/api/docs/guides/your-data)** (EEA and Switzerland) with storage *and* inference in the region, through the endpoint `eu.api.openai.com`. It is a contract option: you need an EU project, an arrangement such as Zero Data Retention, and a talk with OpenAI's sales team, and it costs a surcharge for newer models.
- **Mistral AI** is a French company. Its [EU endpoint](https://docs.mistral.ai/inference/regional-inference) `api.eu.mistral.ai` keeps inference in the EU and EFTA countries; the default endpoint `api.mistral.ai` makes no promise about the location. Function calling works on the regional endpoint, and that is all this agent needs. Mistral's own Agents API, batch processing and file uploads are not available there, and account data, keys and billing are not regional.

So for an analytics tool with real company data in a German company, I would point you to OpenAI's models in the EU region today: a clean AVV with processing on European servers is much easier to get there.
A company I work for chose OpenAI over Anthropic for exactly this reason.
In the demo, that is configuration only: `MODEL=openai/…`, the API key, and `OPENAI_BASE_URL=https://eu.api.openai.com/v1`.
Mastra reads these settings on the Node.js track, and the .NET track reads the same three and takes its `IChatClient` from OpenAI's SDK.

One more switch matters with OpenAI, and it is easy to miss: who keeps the conversation?
Our agents keep nothing; the browser sends the whole chat with every request.
But OpenAI's newer [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) has a parameter `store` that "defaults to true when omitted. If set to true, response data will be stored for at least 30 days".
Mastra calls OpenAI's models through exactly this API, and it sends no `store` field, so by default every answer, including the tool results with your sales figures, stays on OpenAI's servers.
The demo switches that off in both Mastra agents:

```ts
new Agent({
  // …
  defaultOptions: { providerOptions: { openai: { store: false } } },
});
```

The .NET backend talks to OpenAI through the older Chat Completions API, where `store` is false by default.
That is not a property of the agent framework: Microsoft.Extensions.AI also has a client for the Responses API, and it leaves `store` at OpenAI's default as well. It even uses the stored answer on purpose: the next request then only sends a `previous_response_id`, and the conversation lives at OpenAI.
So whichever framework you use: with the Responses API, set `store: false` yourself, and check it in the traffic window.

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

Mistral works with both backends of the demo.
`MODEL=mistral/mistral-large-latest` and `MISTRAL_API_KEY` are enough for the default endpoint; for the EU endpoint, add `MISTRAL_BASE_URL=https://api.eu.mistral.ai/v1`.
Mastra reads the address of every provider from `<PROVIDER>_BASE_URL`, and the .NET backend reads the same variables.
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
- **Watch the network.** The browser's developer tools show every request of the app; on the server, the [traffic window](/blog/2026-11-agentic-analytics-in-practice#watching-the-traffic) shows only the requests to the LLM provider; to catch other outgoing connections, watch the network traffic of the containers.

## How the Series Continues

We now have data without personal references, row-level security that fails closed, and a semantic layer that both backends serve with the same contract.
Part 2 puts the agent on top of it. You will see how the tool schemas are generated from the semantic layer, so the model only knows the names that exist, and how little code it takes to serve the agent over AG-UI from the backend you already have.
Pick the stack you work with; both lead to the same Angular app in part 3:

- [Part 2 for .NET](/blog/2026-11-agentic-analytics-dotnet): the semantic layer with Entity Framework Core and expression trees, the agent with the Microsoft Agent Framework in ASP.NET Core.
- [Part 2 for Node.js](/blog/2026-11-agentic-analytics-node): the semantic layer with Drizzle, the agent with Mastra in NestJS, and the agent as a separate service (path B).

## Glossary

Many of these concepts have different names in different frameworks.
The first table explains the terms as this series uses them, the second one shows what the frameworks call them.

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
| **Path A / path B** | Agent in the existing backend, or as a separate service | Terms of this series |

### Same Concept, Different Names

The same idea often has a different name in each framework, and sometimes the same name means different things.
A dash means that the framework has no name of its own for it or that this series does not use it.

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
