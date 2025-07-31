export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Deletion Instructions</h1>
        
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Delete Your Data</h2>
            <p className="text-gray-700 mb-4">
              If you want to delete your data from our Instagram Feed application, 
              you have several options:
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Option 1: Revoke Access via Instagram</h2>
            <ol className="list-decimal pl-6 text-gray-700 space-y-2">
              <li>Go to your Instagram account settings</li>
              <li>Navigate to "Privacy and Security" → "Apps and Websites"</li>
              <li>Find our application in the "Active" tab</li>
              <li>Click "Remove" to revoke access</li>
              <li>Your data will be automatically deleted within 24 hours</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Option 2: Contact Us Directly</h2>
            <p className="text-gray-700 mb-4">
              Send us an email with your Instagram username and we will delete 
              all your data within 48 hours.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Data We Delete</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Your Instagram user ID and username</li>
              <li>Access tokens</li>
              <li>Cached media information</li>
              <li>Session data</li>
              <li>All associated application data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Automatic Deletion</h2>
            <p className="text-gray-700">
              When you revoke access to our application through Instagram, 
              we automatically receive a notification and delete all your data 
              from our systems within 24 hours.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Confirmation</h2>
            <p className="text-gray-700">
              After data deletion, you will receive a confirmation that all your 
              data has been successfully removed from our systems.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}