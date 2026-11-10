import os
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from sdk.python.tests.test_sdk_integration import (
    TestSDKClientAndScrubber,
    TestSDKDjangoMiddlewareIntegration,
    test_project,
)

__all__ = [
    'TestSDKClientAndScrubber',
    'TestSDKDjangoMiddlewareIntegration',
    'test_project',
]
