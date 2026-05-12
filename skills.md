# Skills

Skills provide specialized capabilities. **Always load a skill before using it.**

## How to Use Skills

```
Skill("skill-name")  # Load the skill, then follow its instructions
```

**Do not guess CLI commands.** Load the skill first to get the correct syntax.

---

## Available Skills

### Task Tracking
| Skill | Purpose |
|-------|---------|
| `dw-dev` | 数据开发 |

---

## Skill Discovery

To see all available skills:
```bash
ls ~/.claude/skills/*/SKILL.md
```

To manually read a skill (if Skill() unavailable):
```bash
cat ~/.claude/skills/<name>/SKILL.md
```
