.PHONY: install dev start test clean

install:
	cd backend && pip install -r requirements.txt -i https://pypi.org/simple --extra-index-url https://pypi.org/simple

dev:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

start:
	cd backend && uvicorn main:app --host 0.0.0.0 --port 8000

test:
	cd backend && pytest

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name ".DS_Store" -delete
