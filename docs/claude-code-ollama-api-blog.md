---
title: "Claude Code with Anthropic API compatibility · Ollama Blog"
source: "https://ollama.com/blog/claude"
author:
published:
created: 2026-01-19
description: "Ollama is now compatible with the Anthropic Messages API, making it possible to use tools like Claude Code with open models."
tags:
  - "clippings"
---
## Claude Code with Anthropic API compatibility

## January 16, 2026

![Claude Code demo](https://files.ollama.com/claude-code.png)

Ollama v0.14.0 and later are now compatible with the Anthropic [Messages API](https://docs.anthropic.com/en/api/messages), making it possible to use tools like [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with open-source models.

Run Claude Code with local models on your machine, or connect to cloud models through ollama.com.

## Using Claude Code with Ollama

Claude Code is Anthropic’s agentic coding tool that lives in your terminal. With Anthropic API support, you can now use Claude Code with any Ollama model.

### Get started

**Install Claude Code**

macOS, Linux, WSL:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows PowerShell:

```bash
irm https://claude.ai/install.ps1 | iex
```

Windows CMD:

```bash
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

**Connect Ollama**

Configure environment variables to use Ollama:

```bash
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_BASE_URL=http://localhost:11434
```

Run Claude Code with an Ollama model:

```bash
claude --model gpt-oss:20b
```

Models in Ollama’s Cloud also work with Claude Code:

```bash
claude --model glm-4.7:cloud
```

It is recommended to run a model with at least 64k tokens context length.

![Context length settings](https://files.ollama.com/context-length-settings.png)

For more information, please see [context length documentation](https://docs.ollama.com/context-length) on how to make changes.

Ollama’s cloud models always run at their full context length.

For coding use cases with Claude Code:

**Local models:**\- `gpt-oss:20b` - `qwen3-coder`

**Cloud models:**\- `glm-4.7:cloud` - `minimax-m2.1:cloud`

## Using the Anthropic SDK

Existing applications using the Anthropic SDK can connect to Ollama by changing the base URL. See the [Anthropic compatibility documentation](https://docs.ollama.com/api/anthropic-compatibility) for details.

### Python

```python
import anthropic

client = anthropic.Anthropic(
    base_url='http://localhost:11434',
    api_key='ollama',  # required but ignored
)

message = client.messages.create(
    model='qwen3-coder',
    messages=[
        {'role': 'user', 'content': 'Write a function to check if a number is prime'}
    ]
)
print(message.content[0].text)
```

### JavaScript

```javascript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  baseURL: 'http://localhost:11434',
  apiKey: 'ollama',
})

const message = await anthropic.messages.create({
  model: 'qwen3-coder',
  messages: [{ role: 'user', content: 'Write a function to check if a number is prime' }],
})

console.log(message.content[0].text)
```

## Tool calling

Models can use tools to interact with external systems:

```python
import anthropic

client = anthropic.Anthropic(
    base_url='http://localhost:11434',
    api_key='ollama',
)

message = client.messages.create(
    model='qwen3-coder',
    tools=[
        {
            'name': 'get_weather',
            'description': 'Get the current weather in a location',
            'input_schema': {
                'type': 'object',
                'properties': {
                    'location': {
                        'type': 'string',
                        'description': 'The city and state, e.g. San Francisco, CA'
                    }
                },
                'required': ['location']
            }
        }
    ],
    messages=[{'role': 'user', 'content': "What's the weather in San Francisco?"}]
)

for block in message.content:
    if block.type == 'tool_use':
        print(f'Tool: {block.name}')
        print(f'Input: {block.input}')
```

## Supported features

- Messages and multi-turn conversations
- Streaming
- System prompts
- Tool calling / function calling
- Extended thinking
- Vision (image input)

For a complete list of supported features, see the [Anthropic compatibility documentation](https://docs.ollama.com/api/anthropic-compatibility).

## Learn more

For more detailed setup instructions and configuration options, see the [Claude Code guide](https://docs.ollama.com/integrations/claude-code).