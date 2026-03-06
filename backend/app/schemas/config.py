from pydantic import BaseModel


class PublicConfigResponse(BaseModel):
    auth0_domain: str | None = None
    auth0_client_id: str | None = None
    auth0_audience: str | None = None
    auth0_scope: str
    configured: bool
    dev_bypass_auth: bool = False
