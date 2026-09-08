from fastapi import APIRouter

from app.engines import optimization_engine
from app.schemas import WhatIfRequest

router = APIRouter()


@router.post("")
def run_whatif(payload: WhatIfRequest):
    ranked = optimization_engine.rank_scenarios(
        payload.asset_id,
        [a.model_dump() for a in payload.candidate_actions],
    )
    return {"ranked_scenarios": ranked}
