---
sidebar_position: 3
title: Accessibility
description: WCAG compliance and accessibility guidelines
---

# Accessibility

<!-- TODO: Conduct WCAG audit and document compliance status -->

## Current Status

Accessibility has been identified as a gap area (4/10 in UX audit). A comprehensive WCAG 2.1 AA audit is planned.

## Known Issues

- Inconsistent focus management across forms
- No systematic screen reader testing
- Color contrast not verified against WCAG standards
- Missing ARIA labels on interactive elements

## Guidelines

All new components should follow these accessibility principles:

1. **Keyboard navigation** - All interactive elements must be keyboard accessible
2. **Screen reader support** - Use semantic HTML and ARIA labels where needed
3. **Color contrast** - Meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text)
4. **Focus management** - Visible focus indicators, logical tab order
5. **Error identification** - Form errors must be programmatically associated with their fields
