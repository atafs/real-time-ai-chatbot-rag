describe("RAG Chatbot", () => {
  beforeEach(() => {
    // Visit the frontend
    cy.visit("http://localhost:3000");
    // Mock backend upload to avoid dependency on backend
    cy.intercept("POST", "http://localhost:4000/upload", {
      statusCode: 200,
      body: { message: "Document processed" },
    }).as("uploadFile");
  });

  it("uploads a file and sends a message", () => {
    const fileName = "test.pdf";
    // Attach a mock PDF file
    cy.fixture(fileName, "binary")
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get('input[type="file"]').attachFile({
          fileContent,
          fileName,
          mimeType: "application/pdf",
        });
      });

    // Click upload button
    cy.get('button[aria-label="Upload file"]').click({ force: true });
    // Wait for toast notification
    cy.get(".Toastify__toast--success", { timeout: 10000 }).should(
      "contain",
      "File uploaded"
    );

    // Type and send a message
    cy.get('input[placeholder="Ask a question"]').type("What is this?");
    cy.get("button").contains("Send").click();

    // Check user and bot messages
    cy.get(".chat .user", { timeout: 10000 }).should(
      "contain",
      "What is this?"
    );
    cy.get(".chat .bot", { timeout: 10000 })
      .should("exist")
      .and("not.be.empty");
  });
});
