# Security Policy

## Reporting a Vulnerability

Please report suspected vulnerabilities privately. Do not open public issues for security reports.

- Preferred: use GitHub's private vulnerability reporting for this repository.
- Alternative: contact the repository owner directly and include reproduction steps, impact, and any suggested remediation.

You should expect acknowledgement as soon as practical, followed by validation, remediation, and coordinated disclosure guidance when applicable.

## Security Expectations

- Never commit secrets, tokens, or customer data to the repository.
- Use environment variables or platform secret stores for sensitive configuration.
- Keep dependencies updated and review automated dependency PRs promptly.
- Require pull request review for security-sensitive paths using `CODEOWNERS`.

## Recommended GitHub Settings

The repository baseline in code should be paired with these GitHub-side settings:

- Enable branch protection for `main`
- Require pull request review and passing status checks
- Enable secret scanning and push protection
- Enable Dependabot alerts and security updates
- Enable private vulnerability reporting
