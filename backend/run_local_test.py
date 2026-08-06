import unittest
import sys
from test_all_apis import APCTestSuite
from app import create_app
from seed import seed_database

if __name__ == '__main__':
    print("=" * 60)
    print("STARTING LOCAL API & WORKFLOW TEST SUITE FOR APC ATTENDANCE")
    print("=" * 60)

    suite = unittest.TestLoader().loadTestsFromTestCase(APCTestSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if result.wasSuccessful():
        print("\nALL 11 TEST CASES PASSED SUCCESSFULLY! WORKFLOW VERIFIED.")
        sys.exit(0)
    else:
        print("\nTEST FAILURES ENCOUNTERED.")
        sys.exit(1)
