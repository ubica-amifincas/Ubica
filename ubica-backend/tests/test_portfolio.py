"""Mi cartera inmobiliaria: estimación con datos oficiales, rentabilidad y aislamiento entre usuarios."""
from datetime import date

import pytest

import models
from conftest import auth
from services import portfolio

BASE = {"name": "Piso centro", "purchase_price": 100000}


def murcia(quarter):
    m = portfolio.find_municipio("Murcia", "Murcia")
    return portfolio.value_at(m, quarter)


def test_estimacion_con_el_indice_oficial():
    # Comprado en el 1.er trimestre de 2015: el valor se mueve como el €/m² oficial de Murcia desde entonces
    p = models.PortfolioProperty(user_id=1, name="x", municipio="Murcia", provincia="Murcia", purchase_price=100000, purchase_date=date(2015, 2, 10))
    est = portfolio.estimate(p)
    assert est["metodo"] == "indice"
    assert est["valor"] == round(100000 * portfolio.latest(portfolio.find_municipio("Murcia"))[1] / murcia("2015-T1"))
    assert est["valor_m2_zona"] == 1580


def test_otros_metodos_de_estimacion():
    sin_fecha = models.PortfolioProperty(user_id=1, name="x", municipio="murcia", area_m2=100, purchase_price=90000)
    assert portfolio.estimate(sin_fecha) == {"valor": 158000, "metodo": "m2", "valor_m2_zona": 1580}
    manual = models.PortfolioProperty(user_id=1, name="x", municipio="Murcia", purchase_price=90000, current_value_manual=123456)
    assert portfolio.estimate(manual)["valor"] == 123456 and portfolio.estimate(manual)["metodo"] == "manual"
    nada = models.PortfolioProperty(user_id=1, name="x", purchase_price=90000)
    assert portfolio.estimate(nada) == {"valor": 90000, "metodo": "compra", "valor_m2_zona": None}
    # Antes de 2005 (inicio de la serie) se toma el primer dato publicado
    antigua = models.PortfolioProperty(user_id=1, name="x", municipio="Murcia", purchase_price=100000, purchase_date=date(1999, 5, 1))
    assert portfolio.estimate(antigua)["valor"] == round(100000 * 1580 / murcia("2005-T1"))


def test_rentabilidad_y_flujo_de_caja():
    p = models.PortfolioProperty(user_id=1, name="x", purchase_price=100000, purchase_costs=10000, current_value_manual=120000,
                                 mortgage_pending=50000, mortgage_monthly=300, rent_monthly=700, community_monthly=50,
                                 ibi_yearly=300, insurance_yearly=200, other_yearly=100)
    c = portfolio.metrics(p)
    assert c["invertido"] == 110000 and c["ingresos_anuales"] == 8400 and c["gastos_anuales"] == 1200
    assert c["rentabilidad_bruta"] == round(8400 / 110000 * 100, 2) and c["rentabilidad_neta"] == round(7200 / 110000 * 100, 2)
    assert c["flujo_caja_mensual"] == round((8400 - 1200 - 3600) / 12)
    assert c["plusvalia"] == 20000 and c["plusvalia_porcentaje"] == 20.0 and c["patrimonio_neto"] == 70000


def test_buscar_municipios(client, make_user):
    h = auth(make_user())
    r = client.get("/api/portfolio/municipios", params={"q": "cartag"}, headers=h).json()
    assert r[0] == {"municipio": "Cartagena", "provincia": "Murcia", "eur_m2": 1486}
    assert client.get("/api/portfolio/municipios", params={"q": "x"}, headers=h).status_code == 422


def test_ciclo_completo(client, make_user):
    u = make_user()
    h = auth(u)
    assert client.get("/api/portfolio", headers=h).json()["viviendas"] == []

    r = client.post("/api/portfolio/properties", headers=h, json={**BASE, "municipio": "murcia", "purchase_date": "2015-02-10", "rent_monthly": 650})
    assert r.status_code == 200, r.text
    piso = r.json()
    assert piso["municipio"] == "Murcia" and piso["provincia"] == "Murcia" and piso["calculo"]["metodo"] == "indice"
    assert "user_id" not in piso

    r = client.put(f"/api/portfolio/properties/{piso['id']}", headers=h, json={**BASE, "name": "Piso alquilado", "current_value_manual": 150000})
    assert r.json()["name"] == "Piso alquilado" and r.json()["calculo"]["valor"] == 150000 and r.json()["municipio"] is None

    otros = client.put("/api/portfolio/items", headers=h, json=[
        {"kind": "asset", "name": "Ahorros", "amount": 20000}, {"kind": "liability", "name": "Préstamo coche", "amount": 5000}]).json()
    assert [(i["kind"], i["amount"]) for i in otros] == [("asset", 20000), ("liability", 5000)]

    cartera = client.get("/api/portfolio", headers=h).json()
    assert cartera["resumen"]["patrimonio_neto"] == 150000 + 20000 - 5000
    assert "Ministerio de Vivienda" in cartera["datos_oficiales"]["fuente"]

    assert client.delete(f"/api/portfolio/properties/{piso['id']}", headers=h).status_code == 200
    assert client.get("/api/portfolio", headers=h).json()["viviendas"] == []


def test_evolucion_desde_la_primera_compra(client, make_user):
    h = auth(make_user())
    client.post("/api/portfolio/properties", headers=h, json={**BASE, "municipio": "Murcia", "purchase_date": "2024-05-01"})
    evo = client.get("/api/portfolio", headers=h).json()["evolucion"]
    assert evo[0]["trimestre"] == "2024-T2" and evo[0]["valor"] == 100000
    assert evo[-1]["trimestre"] == "2026-T2" and evo[-1]["valor"] == round(100000 * 1580 / murcia("2024-T2"))


def test_cada_usuario_solo_ve_lo_suyo(client, make_user):
    ana, beto = make_user(email="ana@example.com"), make_user(email="beto@example.com")
    piso = client.post("/api/portfolio/properties", headers=auth(ana), json=BASE).json()
    client.put("/api/portfolio/items", headers=auth(ana), json=[{"kind": "asset", "name": "Ahorros", "amount": 1}])
    assert client.get("/api/portfolio", headers=auth(beto)).json()["viviendas"] == []
    assert client.get("/api/portfolio", headers=auth(beto)).json()["otros"] == []
    assert client.put(f"/api/portfolio/properties/{piso['id']}", headers=auth(beto), json=BASE).status_code == 404
    assert client.delete(f"/api/portfolio/properties/{piso['id']}", headers=auth(beto)).status_code == 404
    # Cambiar la lista de otros de beto no toca la de ana
    client.put("/api/portfolio/items", headers=auth(beto), json=[])
    assert len(client.get("/api/portfolio", headers=auth(ana)).json()["otros"]) == 1


@pytest.mark.parametrize("cambio", [
    {"purchase_price": 0}, {"purchase_price": -1}, {"name": ""}, {"rent_monthly": -5},
    {"purchase_date": "2999-01-01"}, {"municipio": "Villanueva de Ningún Sitio"}, {"area_m2": 0},
])
def test_datos_no_validos(client, make_user, cambio):
    r = client.post("/api/portfolio/properties", headers=auth(make_user()), json={**BASE, **cambio})
    assert r.status_code == 422


def test_borrar_la_cuenta_borra_la_cartera(client, make_user, db):
    from services.users import delete_user
    u = make_user()
    client.post("/api/portfolio/properties", headers=auth(u), json=BASE)
    client.put("/api/portfolio/items", headers=auth(u), json=[{"kind": "asset", "name": "Ahorros", "amount": 1}])
    delete_user(db, db.get(models.User, u.id))
    db.expire_all()
    from sqlmodel import select
    assert db.exec(select(models.PortfolioProperty)).all() == [] and db.exec(select(models.PortfolioItem)).all() == []
