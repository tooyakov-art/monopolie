"""
Monopoly MCP Server — strategic dashboard for all projects.
Exposes project data, income tracking, and Trello board management.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

mcp = FastMCP("monopoly", instructions="""
Монополие — стратегический командный центр.
Управляет проектами, доходами, задачами через Trello.
Это часть Life OS — отвечает за бизнес, доходы и контроль.
""")

DATA_PATH = os.path.join(os.path.dirname(__file__), "api", "data.json")

TRELLO_KEY = os.environ["TRELLO_KEY"]
TRELLO_TOKEN = os.environ["TRELLO_TOKEN"]
BOARD_ID = "69c92f9a076cc78392612220"


def _read_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_data(data):
    data["updated"] = datetime.now().isoformat()
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _trello_api(method, path, params=None):
    base = f"https://api.trello.com/1/{path}"
    p = {"key": TRELLO_KEY, "token": TRELLO_TOKEN}
    if params:
        p.update(params)
    if method == "GET":
        url = base + "?" + urllib.parse.urlencode(p)
        req = urllib.request.Request(url)
    else:
        url = base + f"?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
        data = urllib.parse.urlencode(params or {}).encode("utf-8")
        req = urllib.request.Request(url, data=data, method=method)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode("utf-8"))


# ============================================================
# Project & Income tools
# ============================================================

@mcp.tool()
def get_projects() -> dict:
    """Get all projects with their status and income."""
    return _read_data()


@mcp.tool()
def get_project(project_id: str) -> dict:
    """Get a specific project by ID (life-os, autobot, x5, spk-bot)."""
    data = _read_data()
    for p in data["projects"]:
        if p["id"] == project_id:
            return p
    return {"error": f"Project {project_id} not found"}


@mcp.tool()
def update_income(project_id: str, amount: int) -> dict:
    """Update income for a project. Amount in tenge."""
    data = _read_data()
    for p in data["projects"]:
        if p["id"] == project_id:
            p["amount"] = amount
            break
    data["total"]["amount"] = sum(p["amount"] for p in data["projects"])
    data["total"]["display"] = f'{data["total"]["amount"]} ₸'
    _write_data(data)
    return {"ok": True, "project": project_id, "amount": amount, "total": data["total"]["amount"]}


@mcp.tool()
def add_project(project_id: str, name: str, desc: str, color: str, icon: str) -> dict:
    """Add a new project to the dashboard."""
    data = _read_data()
    data["projects"].append({
        "id": project_id,
        "icon": icon,
        "name": name,
        "desc": desc,
        "amount": 0,
        "status": "active",
        "color": color,
    })
    _write_data(data)
    return {"ok": True, "project": name}


@mcp.tool()
def set_project_status(project_id: str, status: str, deadline: str = None) -> dict:
    """Set project status: active, dev, deadline, paused. Optional deadline (YYYY-MM-DD)."""
    data = _read_data()
    for p in data["projects"]:
        if p["id"] == project_id:
            p["status"] = status
            if deadline:
                p["deadline"] = deadline
            elif "deadline" in p and status != "deadline":
                del p["deadline"]
            _write_data(data)
            return {"ok": True, "project": project_id, "status": status}
    return {"error": f"Project {project_id} not found"}


# ============================================================
# Trello tools
# ============================================================

@mcp.tool()
def trello_get_tasks() -> list:
    """Get all tasks from Monopoly Trello board grouped by list."""
    lists = _trello_api("GET", f"boards/{BOARD_ID}/lists", {"cards": "open", "card_fields": "name,labels,due"})
    result = []
    for l in lists:
        cards = [{"name": c["name"], "due": c.get("due"), "labels": [lb["name"] for lb in c.get("labels", [])]} for c in l.get("cards", [])]
        result.append({"list": l["name"], "cards": cards})
    return result


@mcp.tool()
def trello_add_task(list_name: str, name: str, label: str = None, due: str = None) -> dict:
    """Add task to Monopoly board. list_name: Сегодня/Завтра/Неделя. label: Life OS/AutoBot/x5/СПК Бот."""
    lists = _trello_api("GET", f"boards/{BOARD_ID}/lists", {"fields": "name"})
    list_id = None
    for l in lists:
        if list_name.lower() in l["name"].lower():
            list_id = l["id"]
            break
    if not list_id:
        return {"error": f"List '{list_name}' not found"}

    params = {"idList": list_id, "name": name}
    if due:
        params["due"] = due

    if label:
        labels = _trello_api("GET", f"boards/{BOARD_ID}/labels")
        for lb in labels:
            if label.lower() in lb.get("name", "").lower():
                params["idLabels"] = lb["id"]
                break

    card = _trello_api("POST", "cards", params)
    return {"ok": True, "card": card["name"], "list": list_name}


@mcp.tool()
def trello_move_task(card_name: str, to_list: str) -> dict:
    """Move a task to another list (Сегодня/Завтра/Неделя)."""
    lists = _trello_api("GET", f"boards/{BOARD_ID}/lists", {"cards": "open", "card_fields": "name"})
    card_id = None
    target_list_id = None
    for l in lists:
        if to_list.lower() in l["name"].lower():
            target_list_id = l["id"]
        for c in l.get("cards", []):
            if card_name.lower() in c["name"].lower():
                card_id = c["id"]
    if not card_id:
        return {"error": f"Card '{card_name}' not found"}
    if not target_list_id:
        return {"error": f"List '{to_list}' not found"}
    _trello_api("PUT", f"cards/{card_id}", {"idList": target_list_id})
    return {"ok": True, "moved": card_name, "to": to_list}


@mcp.tool()
def get_summary() -> dict:
    """Get a quick strategic summary: total income, project statuses, deadlines, today's tasks."""
    data = _read_data()
    tasks = trello_get_tasks()
    today_tasks = []
    for t in tasks:
        if "егодня" in t["list"]:
            today_tasks = [c["name"] for c in t["cards"]]

    deadlines = []
    for p in data["projects"]:
        if p.get("deadline"):
            days = (datetime.fromisoformat(p["deadline"]) - datetime.now()).days
            deadlines.append({"project": p["name"], "days_left": days, "deadline": p["deadline"]})

    return {
        "total_income": data["total"]["amount"],
        "projects": [{"name": p["name"], "status": p["status"], "income": p["amount"]} for p in data["projects"]],
        "deadlines": deadlines,
        "today": today_tasks,
    }


if __name__ == "__main__":
    mcp.run()
