"""Mi cartera inmobiliaria: valor estimado, rentabilidad y evolución de las viviendas de cada usuario.

El valor de mercado se estima con la estadística oficial de valor tasado por municipio (Ministerio de Vivienda,
desde 2005): el precio de compra se actualiza con la variación del €/m² del municipio entre el trimestre de la
compra y el último publicado. Si no hay fecha o municipio, se usan los m²; si tampoco, el precio de compra.
"""
import json
import os
import unicodedata
from datetime import date
from functools import lru_cache
from typing import Optional

import models

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "valor_tasado_historico.json")


def _norm(text: Optional[str]) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", (text or "").strip().lower()) if unicodedata.category(c) != "Mn")


@lru_cache(maxsize=1)
def _history() -> dict:
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)
    data["por_nombre"] = {}
    for m in data["municipios"]:
        data["por_nombre"].setdefault(_norm(m["municipio"]), []).append(m)
    return data


def source() -> dict:
    h = _history()
    return {"fuente": h["fuente"], "ultimo_trimestre": h["trimestres"][-1]}


def find_municipio(municipio: Optional[str], provincia: Optional[str] = None) -> Optional[dict]:
    matches = _history()["por_nombre"].get(_norm(municipio), [])
    if provincia:
        matches = [m for m in matches if _norm(m["provincia"]) == _norm(provincia)] or matches
    return matches[0] if matches else None


def search_municipios(query: str, limit: int = 20) -> list[dict]:
    q = _norm(query)
    found = [m for m in _history()["municipios"] if q in _norm(m["municipio"])]
    found.sort(key=lambda m: (not _norm(m["municipio"]).startswith(q), m["municipio"]))
    return [{"municipio": m["municipio"], "provincia": m["provincia"], "eur_m2": latest(m)[1]} for m in found[:limit]]


def quarter_of(d: date) -> str:
    return f"{d.year}-T{(d.month - 1) // 3 + 1}"


def latest(m: dict) -> tuple[str, Optional[float]]:
    quarters = _history()["trimestres"]
    for i in range(len(quarters) - 1, -1, -1):
        if m["serie"][i] is not None:
            return quarters[i], m["serie"][i]
    return quarters[-1], None


def value_at(m: dict, quarter: str) -> Optional[float]:
    """€/m² del municipio en ese trimestre; si ese trimestre falta, el más cercano anterior (o el primero publicado)."""
    quarters = _history()["trimestres"]
    serie = m["serie"]
    i = next((k for k, q in enumerate(quarters) if q >= quarter), len(quarters) - 1)
    if quarters[i] > quarter and i > 0:
        i -= 1
    for k in range(i, -1, -1):
        if serie[k] is not None:
            return serie[k]
    return next((v for v in serie if v is not None), None)


def estimate(p: models.PortfolioProperty) -> dict:
    """Valor actual estimado y cómo se ha calculado."""
    m = find_municipio(p.municipio, p.provincia) if p.municipio else None
    out = {"valor_m2_zona": latest(m)[1] if m else None}
    if p.current_value_manual:
        return {**out, "valor": p.current_value_manual, "metodo": "manual"}
    if m and p.purchase_date:
        buy, now = value_at(m, quarter_of(p.purchase_date)), latest(m)[1]
        if buy and now:
            return {**out, "valor": round(p.purchase_price * now / buy), "metodo": "indice"}
    if m and p.area_m2 and out["valor_m2_zona"]:
        return {**out, "valor": round(p.area_m2 * out["valor_m2_zona"]), "metodo": "m2"}
    return {**out, "valor": p.purchase_price, "metodo": "compra"}


def metrics(p: models.PortfolioProperty) -> dict:
    est = estimate(p)
    value = est["valor"]
    invested = p.purchase_price + (p.purchase_costs or 0)
    income = (p.rent_monthly or 0) * 12
    expenses = (p.community_monthly or 0) * 12 + (p.ibi_yearly or 0) + (p.insurance_yearly or 0) + (p.other_yearly or 0)
    mortgage = (p.mortgage_monthly or 0) * 12
    return {
        **est,
        "invertido": invested,
        "plusvalia": round(value - p.purchase_price),
        "plusvalia_porcentaje": round((value - p.purchase_price) / p.purchase_price * 100, 1),
        "patrimonio_neto": round(value - (p.mortgage_pending or 0)),
        "ingresos_anuales": round(income),
        "gastos_anuales": round(expenses),
        "rentabilidad_bruta": round(income / invested * 100, 2) if income else None,
        "rentabilidad_neta": round((income - expenses) / invested * 100, 2) if income else None,
        "flujo_caja_mensual": round((income - expenses - mortgage) / 12),
    }


def property_out(p: models.PortfolioProperty) -> dict:
    data = p.model_dump(exclude={"user_id"})
    data["purchase_date"] = p.purchase_date.isoformat() if p.purchase_date else None
    return {**data, "calculo": metrics(p)}


def evolution(props: list[models.PortfolioProperty]) -> list[dict]:
    """Valor estimado del conjunto trimestre a trimestre desde la primera compra (con fecha)."""
    dated = [p for p in props if p.purchase_date]
    if not dated:
        return []
    quarters = [q for q in _history()["trimestres"] if q >= min(quarter_of(p.purchase_date) for p in dated)]
    points = []
    for q in quarters:
        total = 0.0
        for p in dated:
            if quarter_of(p.purchase_date) > q:
                continue
            m = find_municipio(p.municipio, p.provincia) if p.municipio else None
            buy = value_at(m, quarter_of(p.purchase_date)) if m else None
            here = value_at(m, q) if m else None
            total += p.purchase_price * here / buy if buy and here else p.purchase_price
        points.append({"trimestre": q, "valor": round(total)})
    return points


def summary(props: list[models.PortfolioProperty], items: list[models.PortfolioItem]) -> dict:
    calc = [metrics(p) for p in props]
    value = sum(c["valor"] for c in calc)
    mortgages = sum(p.mortgage_pending or 0 for p in props)
    assets = sum(i.amount for i in items if i.kind == "asset")
    liabilities = sum(i.amount for i in items if i.kind == "liability")
    rented = [(p, c) for p, c in zip(props, calc) if c["ingresos_anuales"]]
    invested_rented = sum(c["invertido"] for _, c in rented)
    income = sum(c["ingresos_anuales"] for _, c in rented)
    expenses = sum(c["gastos_anuales"] for _, c in rented)
    return {
        "valor_inmuebles": round(value),
        "hipotecas": round(mortgages),
        "otros_bienes": round(assets),
        "otras_deudas": round(liabilities),
        "patrimonio_neto": round(value + assets - mortgages - liabilities),
        "plusvalia": round(sum(c["plusvalia"] for c in calc)),
        "ingresos_anuales": round(income),
        "flujo_caja_mensual": round(sum(c["flujo_caja_mensual"] for c in calc)),
        # Solo de las viviendas alquiladas: una vivienda propia sin alquilar no rebaja la rentabilidad
        "rentabilidad_bruta": round(income / invested_rented * 100, 2) if invested_rented else None,
        "rentabilidad_neta": round((income - expenses) / invested_rented * 100, 2) if invested_rented else None,
    }
