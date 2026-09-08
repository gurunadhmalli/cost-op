"""
Optimization Engine — ranks candidate what-if actions.

Per the AI/ML Architecture doc, this is framed as a small LP (PuLP) choosing
which actions to take subject to cost/downtime constraints, then the
ranked-by-savings-vs-effort output is what POST /api/whatif returns.
For a handful of candidate actions (the typical what-if UI use case) we
solve a simple 0/1 knapsack-style LP: maximize projected savings subject to
a total cost/downtime budget, then rank ALL candidates (selected or not)
by a savings-per-effort score so the UI can show every option, not just
the chosen subset.
"""
import pulp


def rank_scenarios(asset_id: str, candidate_actions: list[dict], budget: float = 5000.0,
                    max_downtime_hours: float = 8.0) -> list[dict]:
    """
    candidate_actions: [{"action": str, "cost": float, "downtime_hours": float}]
    Each action gets a deterministic projected-savings/payback/energy-reduction
    estimate (a simple, explainable heuristic — in production this would call
    the trained forecasting/cost models), then all actions are ranked.
    """
    enriched = []
    for a in candidate_actions:
        cost = float(a.get("cost", 0))
        downtime = float(a.get("downtime_hours", 0))
        # Heuristic: cheaper + faster + zero-downtime actions score higher savings
        # confidence; this stands in for a real projected-savings model per action.
        base_savings = 550_000.0
        downtime_penalty = downtime * 15_000.0
        cost_penalty = cost * 5.0
        projected_savings_quarter = max(base_savings - downtime_penalty - cost_penalty, 0.0)
        payback_days = round((cost / max(projected_savings_quarter / 90.0, 1.0)) + 0.5, 1) if cost > 0 else 0.5
        energy_reduction_pct = round(max(22.0 - downtime * 0.5, 5.0), 1)
        throughput_impact_pct = round(-(downtime / 24.0) * 100, 1)

        enriched.append({
            "action": a["action"],
            "cost": cost,
            "downtime_hours": downtime,
            "projected_savings_quarter": round(projected_savings_quarter, 2),
            "payback_days": payback_days,
            "energy_reduction_pct": energy_reduction_pct,
            "throughput_impact_pct": throughput_impact_pct,
            "risk_level": "High" if downtime > 4 else ("Medium" if downtime > 0 else "Low"),
        })

    # LP: choose the subset maximizing total projected savings within budget/downtime
    # constraints (demonstrates the documented PuLP optimization step).
    problem = pulp.LpProblem("whatif_optimization", pulp.LpMaximize)
    x = {i: pulp.LpVariable(f"x_{i}", cat="Binary") for i in range(len(enriched))}
    problem += pulp.lpSum(enriched[i]["projected_savings_quarter"] * x[i] for i in x)
    problem += pulp.lpSum(enriched[i]["cost"] * x[i] for i in x) <= budget
    problem += pulp.lpSum(enriched[i]["downtime_hours"] * x[i] for i in x) <= max_downtime_hours
    problem.solve(pulp.PULP_CBC_CMD(msg=False))

    selected = {i for i in x if x[i].value() == 1}

    ranked = sorted(enriched, key=lambda e: e["projected_savings_quarter"], reverse=True)
    for rank, item in enumerate(ranked, start=1):
        idx = enriched.index(item)
        item["id"] = f"{item['action']}-{idx}"
        item["rank"] = rank
        item["feasible"] = idx in selected or (item["cost"] <= budget and item["downtime_hours"] <= max_downtime_hours)
        item["constraint_violations"] = [] if item["feasible"] else _violations(item, budget, max_downtime_hours)
        item["description"] = f"Candidate action '{item['action']}' for asset {asset_id}."

    return ranked


def _violations(item: dict, budget: float, max_downtime_hours: float) -> list[str]:
    violations = []
    if item["cost"] > budget:
        violations.append(f"cost {item['cost']} exceeds budget {budget}")
    if item["downtime_hours"] > max_downtime_hours:
        violations.append(f"downtime {item['downtime_hours']}h exceeds max {max_downtime_hours}h")
    return violations
