# RFCs (Request for Comments)

This directory contains design documents for significant features and changes to Health V1.

## RFC Process

1. **Draft**: Create RFC document using template
2. **Review**: Team reviews and provides feedback
3. **Accept/Reject**: Decision made on implementation
4. **Implement**: Build following the RFC
5. **Archive**: RFC remains as documentation

## RFC Numbering

RFCs are numbered sequentially:
- `0001-feature-name.md`
- `0002-another-feature.md`

## RFC Status

| Status | Description |
|--------|-------------|
| Draft | Under initial creation |
| Review | Open for team feedback |
| Accepted | Approved for implementation |
| Implemented | Feature has been built |
| Rejected | Not moving forward |
| Superseded | Replaced by newer RFC |

## Current RFCs

| RFC | Title | Status | Version |
|-----|-------|--------|---------|
| [0001](./0001-rfc-template.md) | RFC Template | Implemented | 1.0.0 |

## Creating a New RFC

1. Copy the template:
   ```bash
   cp docs/rfcs/0001-rfc-template.md docs/rfcs/NNNN-feature-name.md
   ```

2. Fill in all sections

3. Submit for review (create PR or discuss in team)

4. Once accepted, begin implementation

## RFC Versioning

RFCs are version-controlled with the codebase:
- Each RFC documents which version it was implemented in
- Breaking changes require new RFC or RFC amendment
- Superseded RFCs link to their replacement

## Using Claude Skill

Use `/rfc-feature` skill to:
- Research codebase before creating RFC
- Generate RFC from feature description
- Validate RFC against existing patterns
