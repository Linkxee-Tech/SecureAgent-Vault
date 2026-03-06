from pydantic import BaseModel


class WeatherResponse(BaseModel):
    city: str
    temperature: int
    conditions: str
