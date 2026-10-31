---
title: 'Agentic Analytics with Angular, Part 2: The .NET Backend with the Microsoft Agent Framework'
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
  - Agentic Analytics
  - .NET
  - ASP.NET Core
  - Microsoft Agent Framework
  - Microsoft.Extensions.AI
  - Entity Framework Core
  - Expression Trees
  - SQL Server
  - AG-UI
  - Semantic Layer
language: en
header: agentic-analytics.jpg
---

**In ASP.NET Core, the semantic layer is a handful of typed lambda expressions, and the agent is one more endpoint: the Microsoft Agent Framework turns plain C# methods into tools and serves them over AG-UI.**

> **Agentic Analytics with Angular** is a series in four parts:
>
> 1. [Architecture, and keeping personal data out](/blog/2026-11-agentic-analytics)
> 2. The backend, as you prefer: **.NET with the Microsoft Agent Framework** (this article) or [Node.js with Mastra](/blog/2026-11-agentic-analytics-node)
> 3. [Generative UI in Angular with CopilotKit](/blog/2026-11-agentic-analytics-angular)
> 4. [Compare, watch and fine-tune the agent](/blog/2026-11-agentic-analytics-in-practice)

[Part 1](/blog/2026-11-agentic-analytics) built the data layer: views without personal data, row-level security that fails closed, and the idea of a semantic layer instead of text-to-SQL.
This part builds the .NET track on top of it: ASP.NET Core, Entity Framework Core and SQL Server, with the Microsoft Agent Framework as the agent.
If your team works with Node.js, read [part 2 for Node.js](/blog/2026-11-agentic-analytics-node) instead; both lead to the same Angular app in part 3.

> The complete demo is on GitHub: [angular-schule/demo-agentic-analytics](https://github.com/angular-schule/demo-agentic-analytics).
> Copy `.env.example` to `.env` and `agent/.env.example` to `agent/.env`, add your API key, run `docker compose --profile dotnet up`, and open http://localhost:8080.

## Contents

[[toc]]

## Layer 2: The Semantic Layer with Entity Framework Core

| Backend | ASP.NET Core with EF Core, or NestJS with Drizzle |
| --- | --- |
| What it is | A small HTTP API that turns a JSON query into safe, parameterized SQL |
| Made by | Microsoft (ASP.NET Core, Entity Framework Core, MIT) / the NestJS team (MIT), the Drizzle Team (Apache 2.0) and Rasmus Porsager (postgres.js, Unlicense) |
| Why we need it | The model never writes SQL. The backend decides which measures and dimensions exist and checks every request |
| Alternatives | Any backend you know: Spring Boot, Express, Fastify, Go. For data access: Dapper, Prisma, Kysely, TypeORM. Dedicated semantic layers such as Cube or dbt's MetricFlow do the same job as a product |

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

## Layer 3: The Agent with the Microsoft Agent Framework

The agent is the part that talks to the model.
It has a system prompt, two backend tools (`querySales` for the semantic layer, `findProducts` for the product catalogue), and the frontend adds a third one later.
On path A, it lives in the backend: Mastra in NestJS, the Microsoft Agent Framework in ASP.NET Core.

| Agent (.NET track) | Microsoft Agent Framework |
| --- | --- |
| What it is | Microsoft's framework for agents in C#, Python and Go (preview): agents from any `IChatClient` (the provider-neutral chat interface of Microsoft.Extensions.AI), tools from plain C# methods, workflows, memory and hosting for ASP.NET Core |
| Made by | Microsoft, MIT license; [the direct successor of Semantic Kernel and AutoGen](https://learn.microsoft.com/en-us/agent-framework/overview/), "created by the same teams" |
| Why we need it | It runs the loop between model and tools in the ASP.NET Core process and serves AG-UI with `MapAGUIServer()` |
| Alternatives | The plain `IChatClient` of `Microsoft.Extensions.AI` with your own loop, Semantic Kernel (its predecessor), or path B with Mastra |

### Tools Generated from the Semantic Layer (C#)

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
- **Optional is not nullable.** C# records with `string?` and `int?` become schema types like `["array", "null"]`. The model then sends `"filters": null`, and the Angular app, which checks every chart request against its own Zod schema (shown in part 3) where `filters` is optional, rejects it. The callback therefore removes `null` from optional fields, so both agents describe exactly the same tool.

Like the Mastra agent, the .NET agent gets a system prompt with the dataset description, all dimensions with their allowed values, and a few rules.
The most important one:

```text
- Personal data is not part of the data model: no sales representatives or key account managers,
  no contact persons, no customers as persons. If asked, say that this data is deliberately not
  available to you and offer an analysis at company, product or region level instead.
```

Note the order: the database guarantees that the data is not there, the prompt only makes sure the agent explains it politely.

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

The agent keeps no memory: CopilotKit sends the whole thread with every request.
For a demo, that is ideal: no conversation ends up in a database on the server.

On the .NET side, the AG-UI hosting package is a preview (`1.27.0-preview`) at the time of writing, while the rest of the framework is stable.

### Switching the Model

In the Microsoft Agent Framework, you swap the `IChatClient`: the demo's .NET backend creates one from Anthropic's SDK or, for `MODEL=openai/…`, from OpenAI's SDK through the package `Microsoft.Extensions.AI.OpenAI`.

[Part 4](/blog/2026-11-agentic-analytics-in-practice#switching-the-model) compares the providers, and [part 1](/blog/2026-11-agentic-analytics#what-goes-to-the-llm-provider) explains which of them can process data in Europe.

## How the Series Continues

The server side is complete. [Part 3](/blog/2026-11-agentic-analytics-angular) is where Angular developers feel at home: CopilotKit connects the app to this AG-UI endpoint and draws the tool calls as Angular components.
The Node.js variant of this part, [with Mastra](/blog/2026-11-agentic-analytics-node), is worth a look, too: [part 4](/blog/2026-11-agentic-analytics-in-practice) compares both frameworks and shows the fine print in which they differ.

## Glossary

The terms of this part. The full glossary of the series, including the names that each framework uses, is in [part 1](/blog/2026-11-agentic-analytics#glossary).

| Term | Meaning | Also known as |
| --- | --- | --- |
| **LLM** (large language model) | The model that reads the conversation and writes the answer or a tool call | Model, chat model |
| **Token** | The unit in which a model reads and writes text, a few characters each; the basis for billing and output limits | – |
| **System prompt** | Standing instructions that apply to the whole conversation | Instructions. OpenAI: also *developer* messages. In Microsoft.Extensions.AI, a message with `ChatRole.System` |
| **Tool** | A function described to the model by name, description and JSON schema | OpenAI: function tool. Anthropic: tool use, "also called function calling" |
| **Tool call** | The model's request to run a tool with certain arguments | OpenAI: function call. AG-UI: the events `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_RESULT` |
| **Backend tool** | A tool that runs on the server, next to the agent | Server-side tool. Not to be confused with Anthropic's *server tools* (see *Provider-run tool* below) |
| **Provider-run tool** | A tool that the LLM provider runs on its own infrastructure, e.g. web search | Anthropic: server tools, as opposed to *client tools*, which run in your application (backend included). Vercel AI SDK: provider-executed tools |
| **Agent** | An LLM in a loop with tools and instructions | |
| **Agent framework** | A library that runs the loop, the tools, streaming and the model connection | Mastra, Microsoft Agent Framework, LangGraph, Vercel AI SDK, Google ADK and others |
| **Generative UI** | User interface that the agent's answer produces, beyond text | |
| **AG-UI** | Protocol between app and agent: events over HTTP | Agent-User Interaction Protocol, started by CopilotKit, see [the protocols](/blog/2026-11-agentic-analytics#the-protocols-ag-ui-a2ui-mcp-and-a2a) |
| **SSE** (server-sent events) | An HTTP response that stays open and delivers one event after another | Web standard (`EventSource`); AG-UI's HTTP client receives its events this way |
| **Semantic layer** | Fixed business vocabulary of measures and dimensions, translated into SQL by the backend | dbt: Semantic Layer, powered by MetricFlow. Cube: data model with cubes and views. Looker: LookML. Power BI: semantic model |
| **Measure** | A number that is aggregated with a fixed formula, e.g. revenue | The same in dbt, Cube, Looker and Power BI; dbt builds *metrics* on top of measures |
| **Dimension** | An attribute to group or filter by, e.g. year or country | The same in dbt, Cube and Looker; from dimensional modelling in data warehousing |
| **Text-to-SQL** | The LLM writes SQL itself | Also NL2SQL. This demo avoids it on purpose |
| **View** | A stored `SELECT` that the database offers like a table | SQL standard |
| **Row-level security** | The database decides per connection or user which rows exist | SQL Server: Row-Level Security with security policies (`CREATE SECURITY POLICY`). PostgreSQL: row security policies (`CREATE POLICY`). The demo filters inside the views instead |
| **Path A / path B** | Agent in the existing backend, or as a separate service | Terms of this series |
