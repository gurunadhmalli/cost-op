from fastapi import APIRouter, Depends

from app.core.deps import require_roles
from app.engines import optimization_engine
from app.schemas import WhatIfRequest

router = APIRouter()


@router.post("")
def run_whatif(payload: WhatIfRequest, user: dict = Depends(require_roles("operator", "admin"))):
    ranked = optimization_engine.rank_scenarios(
        payload.asset_id,
        [a.model_dump() for a in payload.candidate_actions],
    )
    return {"ranked_scenarios": ranked}
