import os
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
readme_path = os.path.join(here, "README.md")
long_description = ""
if os.path.exists(readme_path):
    with open(readme_path, encoding="utf-8") as f:
        long_description = f.read()

setup(
    name="crimsonpulse",
    version="1.0.0",
    description="Official Python SDK and Django Telemetry Middleware for CrimsonPulse AI",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="CrimsonPulse AI Team",
    author_email="engineering@crimsonpulse.ai",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[],
    extras_require={
        "django": ["django>=3.2"],
    },
)
