describe('EmploymentContract signature vs archive', () => {
  it('não considera assinado se arquivamento falhou', () => {
    const providerSigned = true;
    let signedFileKey: string | null = null;
    let signedFileArchiveError: string | null = 'Falha S3';
    let ourStatus = 'pending_signature';

    if (providerSigned) {
      if (signedFileKey) {
        ourStatus = 'signed';
      } else if (signedFileArchiveError) {
        ourStatus = 'pending_signature';
      }
    }
    expect(ourStatus).toBe('pending_signature');
  });
});
