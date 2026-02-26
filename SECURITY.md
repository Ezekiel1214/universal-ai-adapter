# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are currently supported for receiving security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | ✅                 |
| 1.0.x   | ✅                 |
| < 1.0   | ❌                 |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to the maintainers or open a GitHub issue with the label `security`.

**Please include:**
1. Description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact
4. Any suggested fixes (optional)

We will:
1. Acknowledge the report within 24 hours
2. Provide a timeline for the fix
3. Credit you in the release notes (if desired)

## Security Best Practices

### API Keys

- **Never** commit API keys to version control
- Use environment variables or secret management tools
- Rotate keys regularly
- Use minimum required permissions

### Local Development

When using Ollama for local development:
- Ollama runs locally, no data leaves your machine
- Ensure your firewall blocks external access to port 11434
- Don't expose Ollama to the internet

### Production Deployment

- Always use HTTPS for API communications
- Implement rate limiting on your services
- Monitor API usage for anomalies
- Set up alerts for unusual patterns
- Use the built-in retry and circuit breaker features

### Data Privacy

- Review provider privacy policies before use
- Some providers may retain prompts/responses for improvement
- Consider using Ollama for sensitive data processing
- The adapter itself does not store or log any data

## Dependencies

This package depends on:
- `openai` - OpenAI SDK
- `@anthropic-ai/sdk` - Anthropic SDK
- `axios` - HTTP client

Ensure you keep these updated for security patches.

## Compliance

- This library does not collect any telemetry
- No analytics or tracking
- All API calls go directly between your application and the AI providers
